const querystring = require('querystring')
const fs = require('fs')
const mime = require('mime')
const S = require('string')
    /**
     * http utils
     * @api public
     */
let HttpUtils = function() {

    }
    /**
     * return request body
     * @param {Object} disks    
     * @api public
     */
HttpUtils.prototype.getBody = function(app) {
        let body = app.request.body || {}
        let url = app.request.url
        let urlInfo = url.split('?')
        if (urlInfo.length > 1) {
            let qbody = querystring.parse(urlInfo[1])
            for (let key in qbody) {
                if (qbody.hasOwnProperty(key)) {
                    body[key] = qbody[key]
                }
            }
        }
        return body
    }
    /**
     * send file
     * @param {Object} app 
     * @param {String} filePath
     * @param {String} fileName  
     * @param {String} forceDownload  
     * @api private
     */
HttpUtils.prototype.sendFile = function*(app, filePath, fileName, forceDownload) {
        let mimeType = mime.lookup(filePath)
        let stat = fs.statSync(filePath)
        let range = app.req.headers.range
        if (range) {
            //video player
            let total = stat.size
            let parts = range.replace(/bytes=/, "").split("-"),
                partialstart = parts[0],
                partialend = parts[1],
                start = parseInt(partialstart, 10),
                end = partialend ? parseInt(partialend, 10) : total - 1,
                chunksize = (end - start) + 1
            app.res.writeHead(206, {
                'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4'
            }) 
            if (start > end) {
                start = end
            }
            let file = fs.createReadStream(filePath, { start: start, end: end })
            file.pipe(app.res)
        } else {
            let userAgent = (app.req.headers['user-agent'] || '').toLowerCase()
            let options = {
                    'Content-Type': mimeType
                }
                //range download
            let startPos = 0
            let endPos = stat.size
            let range = app.request.body['Range']
            if (range) {
                let info = range.split('=')
                let unit = S(info[0]).trim().s
                let posInfo = info[1].split('-')
                let startPosStr = S(posInfo[0]).trim().s
                let endPosStr = ''
                if (posInfo.length == 2) {
                    endPosStr = S(posInfo[1]).trim().s
                }
                if (startPosStr) {
                    startPos = parseInt(startPosStr)
                }
                if (endPosStr) {
                    endPos = parseInt(endPosStr)
                }
            }
            let disposition = "attachment"
            if (forceDownload !== '1') {
                disposition = "inline"
            }
            let encodeFileName = encodeURIComponent(fileName)
            if (userAgent == "" || userAgent.indexOf('android') >= 0 || userAgent.indexOf('miniyun-ios') >= 0 || userAgent.indexOf('ipad') >= 0 || userAgent.indexOf('trident') >= 0 || userAgent.indexOf('msie') >= 0 || userAgent.indexOf('chrome') >= 0 || userAgent.indexOf('miniclient') >= 0) {
                //ie+chrome
                options["Content-Disposition"] = disposition + ';filename="' + encodeFileName + '"'
            } else if (userAgent.indexOf('firefox') >= 0) {
                //firefox
                options['Content-Disposition'] = disposition + ';filename*="utf8\'\'' + encodeFileName + '"'
            } else {
                options['Content-Disposition'] = disposition + ';filename="' + fileName + '"'
            }
            options['Content-Length'] = endPos - startPos
            app.res.writeHead(200, options)
            fs.createReadStream(filePath, { start: startPos, end: endPos }).pipe(app.res)
        }
    }
    /**
     * throw 401 exception
     * @param {Object} app 
     * @api public
     */
HttpUtils.prototype.throwSimple401 = function(app) {
        let error = {
            code: 401,
            error: 'invalid_token',
            error_description: 'The access token provided is invalid.'
        }
        app.status = 401
        app.body = error
    }
    /**
     * throw  exception
     * @param {Object} app 
     * @param {Integer} statusCode
     * @param {String} error 
     * @param {String} description
     * @api public
     */
HttpUtils.prototype.throw = function(app, statusCode, errorObj, description) {
        let error = {
            code: statusCode,
            error: errorObj,
            error_description: description
        }
        app.status = statusCode
        app.body = error
    }
    /**
     * throw exception
     * @param {Object} app
     * @param {String} error
     * @param {String} description  
     * @api public
     */
HttpUtils.prototype.throw409 = function(app, errorObj, description) {
        let error = {
            code: 409,
            error: errorObj,
            error_description: description
        }
        app.status = 409
        app.body = error
    }
    /**
     * throw exception 400
     * @param {Object} app 
     * @api public
     */
HttpUtils.prototype.throw400 = function(app) {
        let url = app.request.url
            // /api/v1/oauth2/token->oauth2/token
        let functionName = url.substring(8, url.length)
        let errors = {
            error: 'Error in call to API function ' + functionName,
            error_description: app.errors
        }
        app.status = 400
        app.body = errors
    }
    /**
     * socket request
     * @param {String} route 
     * @param {Object} data 
     * @api public
     */
HttpUtils.prototype.socketRequest = function(route, data) {
        data = data || {}
        data.local_time = new Date().getTime()
        let socket = global.config.socket
        socket.emit(route, data)
        return function(done) {
            socket.on(route, function(data) {
                return done(null, data)
            })
        }
    }
    /**
     * return minicloud plugin info
     * @api private
     */
HttpUtils.prototype.getPluginInfo = function() {
    return {
        image: global.config['plugins']['ic'] ? true : false,
        doc: global.config['plugins']['dc'] ? true : false,
        mp4: global.config['plugins']['vc'] ? true : false,
    }
}
exports.HttpUtils = HttpUtils
