var fs = require('fs')
var mime = require('mime')
var querystring = require('querystring')
var request = require('co-request')
var FileUtils = require('../../utils/file-utils').FileUtils
var fileUtils = new FileUtils()
var HttpUtils = require('../../utils/http-utils').HttpUtils
var httpUtils = new HttpUtils()
var crypto = require('crypto')
var formidable = require('formidable')
var mkdirp = require('mkdirp')
var path = require('path')

/**
 * file upload success report to minicloud
 * @param {Object} form    
 * @api private
 */
var __uploadSuccessToMinicloud = function*(form) {
    var file = form.files.file
    var params = form.fields
    var callback = JSON.parse(new Buffer(params.callback, 'base64').toString())
    var url = callback.callbackUrl
    var body = callback.callbackBody
    body = querystring.parse(body)
    for (var key in body) {
        var value = body[key]
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
var __convertImage = function*(params, localPath) {
        var mimeType = mime.lookup(params.key)
        var ic = global.config['plugins']['ic']
        if (ic) {
            var types = ic['types']
            for (var i = 0; i < types.length; i++) {
                if (mimeType === types[i]) {
                    var convert = ic['convert']
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
var __convertDoc = function(params, localPath) {
        var isDoc = params['doc_convert_start_callback'] !== 'undefined' ? true : false
        var dc = global.config['plugins']['dc']
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
var __convertVideo = function(params, localPath) {
        var isVideo = params['video_convert_start_callback'] !== 'undefined' ? true : false
        var vc = global.config['plugins']['vc']
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
var __getUploadBody = function(app) {
        var body = app.request.body
        if (!body.name) {
            httpUtils.throw409(app, 'bad_request', 'bad request')
            return null
        }
        var savePath = fileUtils.newSavePath(body.name)
        var options = {
            maxFieldsSize: 1024 * 1024 * 1024 * 1024,
            hash: 'md5',
            uploadDir: savePath.temp_path
        }
        var form = new formidable.IncomingForm()
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
var __saveFile = function(form) {
        var file = form.files.file
        var tmpFilePath = file.path //temp file 
        var localPath = path.join(form.root, form.fields.key) //file save path
        var folderPath = path.dirname(localPath)
        if (!fs.existsSync(folderPath)) {
            mkdirp.sync(folderPath)
        }
        return function(done) {
            fileUtils.moveFile(tmpFilePath, localPath, function() {
                return done(null, localPath)
            })
        }
    }
    /**
     * upload file 
     * @api public
     */
exports.upload = function*() {
    var form = yield __getUploadBody(this)
    if (!form) {
        return
    }
    var body = form.fields
        //valid key
    var policyBase64 = body.policy
    var policyStr = new Buffer(policyBase64, 'base64').toString()
    var policy = null
    try {
        policy = JSON.parse(policyStr)
    } catch (e) {
        return httpUtils.throw409(this, 'invalid_signature', 'invalid signature')
    }
    var conditions = policy.conditions
    var bucketPath = conditions[1][2]
        //set file key
    body.key = bucketPath
        //check timeout          
    var expire = conditions[1][3]
    var currentTime = new Date().getTime() / 1000
    var timeDiff = currentTime - expire
    if (timeDiff > 0) {
        return httpUtils.throw409(this, 'url_expire', 'url expire')
    }
    //valid signatrue 
    var secret = global.config.access_token.secret
    var hash = crypto.createHmac('sha1', secret).update(policyBase64).digest().toString('base64')
    if (hash !== body.signature) {
        return httpUtils.throw409(this, 'invalid_signature', 'invalid signature')
    }
    //valid key
    var policyBase64 = body.policy
    var policyStr = new Buffer(policyBase64, 'base64').toString()
    var policy = JSON.parse(policyStr)
    var conditions = policy.conditions
    var bucketPath = conditions[1][2]
    if (bucketPath !== body.key) {
        return httpUtils.throw409(this, 'invalid_signature', 'invalid signature')
    }
    //save file
    var localPath = yield __saveFile(form)
        //report to minicloud
    var result = yield __uploadSuccessToMinicloud(form)
        //convert image
    var isOk = yield __convertImage(form.fields, localPath)
    if (!isOk) {
        //convert doc
        isOk = __convertDoc(form.fields, localPath)
        if (!isOk) {
            //convert video
            __convertVideo(form.fields, localPath)
        }
    }
    this.status = result.statusCode
    this.body = result.body
}
