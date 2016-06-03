const fs = require('fs')
const mime = require('mime')
const querystring = require('querystring')
const request = require('co-request')
const FileUtils = require('../../utils/file-utils').FileUtils
let fileUtils = new FileUtils()
const HttpUtils = require('../../utils/http-utils').HttpUtils
let httpUtils = new HttpUtils()
const crypto = require('crypto')
const formidable = require('formidable')
const mkdirp = require('mkdirp')
const path = require('path')
    /**
     * file upload success report to minicloud
     * @param {Object} form    
     * @api private
     */
let __uploadSuccessToMinicloud = function*(form) {
    let file = form.files.file
    let params = form.fields
    let callback = JSON.parse(new Buffer(params.callback, 'base64').toString())
    let url = callback.callbackUrl
    let body = callback.callbackBody
    body = querystring.parse(body)
    for (let key in body) {
        let value = body[key]
        value = value.replace('${object}', params.key)
        value = value.replace('${size}', file.size)
        value = value.replace('${etag}', file.hash)
        value = value.replace('${mimeType}', mime.lookup(params.key))
        value = value.replace('${imageInfo.height}', 0)
        value = value.replace('${imageInfo.width}', 0)
        body[key] = value
    }
    return yield request.post(url, { form: body })
}

/**
 * convert image
 * @param {Object} params  
 * @param {String} localPath
 * @api private
 */
let __convertImage = function*(params, localPath) {
        let mimeType = mime.lookup(params.key)
        let ic = global.config['plugins']['ic']
        if (ic) {
            let types = ic['types']
            for (let i = 0; i < types.length; i++) {
                if (mimeType === types[i]) {
                    let convert = ic['convert']
                    yield convert.createThumbnail(localPath, params.key)
                    yield convert.createThumbnail(localPath, params.key, 32)
                    return true
                }
            }

        }
        return false
    }
    /**
     * convert file to doc  
     * @api private
     */
let __convertDoc = function(params, localPath) {
        let isDoc = params['doc_convert_start_callback'] !== 'undefined' ? true : false
        let dc = global.config['plugins']['dc']
        if (dc && isDoc) {
            dc['convert'].addTask(localPath, params)
            return true
        }
        return false
    }
    /**
     * convert video 
     * @api private
     */
let __convertVideo = function(params, localPath) {
        let isVideo = params['video_convert_start_callback'] !== 'undefined' ? true : false
        let vc = global.config['plugins']['vc']
        if (vc && isVideo) {
            vc['convert'].addTask(localPath, params)
            return true
        }
        return false
    }
    /**
     * return upload body
     * @param {Object} app    
     * @api privater
     */
let __getUploadBody = function(app) {
        let body = app.request.body
        if (!body.name) {
            httpUtils.throw409(app, 'bad_request', 'bad request')
            return null
        }
        let savePath = fileUtils.newSavePath(body.name)
        let options = {
            maxFieldsSize: 1024 * 1024 * 1024 * 1024,
            hash: 'md5',
            uploadDir: savePath.temp_path
        }
        let form = new formidable.IncomingForm()
        form.maxFieldsSize = options.maxFieldsSize
        form.hash = options.hash
        form.uploadDir = options.uploadDir
        return function(done) {
            form.parse(app.req, function(err, fields, files) {
                fields.hash = files.file.hash
                return done(null, {
                    files: files,
                    fields: fields,
                    root: savePath.root_path
                })
            })
        }
    }
    /**
     * move temp file to disk
     * @param {Object} form 
     * @api private
     */
let __saveFile = function*(form) {
        let file = form.files.file
        let tmpFilePath = file.path //temp file 
        let localPath = path.join(form.root, form.fields.key) //file save path
        if (fileUtils.exists(localPath)) {
            //handle history
            yield __handleHistoryFile(localPath, form)
        } else {
            let folderPath = path.dirname(localPath)
            if (!fileUtils.exists(folderPath)) {
                mkdirp.sync(folderPath)
            }
        }
        let moveFile = function() {
            return function(done) {
                fileUtils.moveFile(tmpFilePath, localPath, function() {
                    return done(null, localPath)
                })
            }
        }
        return yield moveFile()
    }
    /**
     * handle history file
     * @param {String} localPath 
     * @api private
     */
let __handleHistoryFile = function*(localPath, form) {
        let index = 0
        let historyFolder = localPath + '-history'
        if (!fileUtils.exists(historyFolder)) {
            mkdirp.sync(historyFolder)
        } else {
            //stat sub files count
            index = fs.readdirSync(historyFolder).length
        }
        let ext = path.extname(localPath)
        let name = path.basename(localPath, ext)
        let historyFileName = name + '-' + index + ext
        let historyFilePath = path.join(historyFolder, historyFileName)
        let moveFile = function() {
            return function(done) {
                fileUtils.moveFile(localPath, historyFilePath, function() {
                    return done(null, historyFilePath)
                })
            }
        }
        yield moveFile()
            //send request to minicloud.io
        let params = form.fields
        let remoteNewPath = path.join(path.dirname(params.key), path.basename(historyFolder), historyFileName)
        let callback = JSON.parse(new Buffer(params.callback, 'base64').toString())
        let beforeVersionBody = callback.beforeVersionBody
        if (beforeVersionBody) {
            let body = querystring.parse(beforeVersionBody)
            for (let key in body) {
                let value = body[key]
                value = value.replace('${path}', remoteNewPath) 
                body[key] = value
            }
            //report file history 
            yield httpUtils.socketRequest('file history', body)
        }
    }
    /**
     * upload file 
     * @api public
     */
exports.upload = function*() {
    let form = yield __getUploadBody(this)
    if (!form) {
        return
    }
    let body = form.fields
        //valid key
    let policyBase64 = body.policy
    let policyStr = new Buffer(policyBase64, 'base64').toString()
    let policy = null
    try {
        policy = JSON.parse(policyStr)
    } catch (e) {
        return httpUtils.throw409(this, 'invalid_signature', 'invalid signature')
    }
    let conditions = policy.conditions
    let bucketPath = conditions[1][2]
        //set file key
    body.key = bucketPath
        //check timeout          
    let expire = conditions[1][3]
    let currentTime = new Date().getTime() / 1000
    let timeDiff = currentTime - expire
    if (timeDiff > 0) {
        return httpUtils.throw409(this, 'url_expire', 'url expire')
    }
    //valid signatrue 
    let secret = global.config.access_token.secret
    let hash = crypto.createHmac('sha1', secret).update(policyBase64).digest().toString('base64')
    if (hash !== body.signature) {
        return httpUtils.throw409(this, 'invalid_signature', 'invalid signature')
    }
    //report to minicloud
    let res = yield __uploadSuccessToMinicloud(form)
    if (res.statusCode == '200') {
        //save file
        let localPath = yield __saveFile(form)
            //convert image
        let isOk = yield __convertImage(form.fields, localPath)
        if (!isOk) {
            //convert doc
            isOk = __convertDoc(form.fields, localPath)
            if (!isOk) {
                //convert video
                __convertVideo(form.fields, localPath)
            }
        }
    }
    this.status = res.statusCode
    this.body = res.body
}
