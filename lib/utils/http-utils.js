const querystring = require('querystring')
const fs = require('fs')
const mime = require('mime')
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
        let userAgent = (app.req.headers['user-agent'] || '').toLowerCase()
        let options = {
            'Content-Type': mimeType
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
        options['Content-Length'] = stat.size

        app.res.writeHead(200, options)
        fs.createReadStream(filePath).pipe(app.res)
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
