var querystring = require('querystring')
var fs = require('fs')
var mime = require('mime')
    /**
     * http utils
     * @api public
     */
var HttpUtils = function() {

    }
    /**
     * return request body
     * @param {Object} disks    
     * @api public
     */
HttpUtils.prototype.getBody = function(app) {
        var body = app.request.body || {}
        var url = app.request.url
        var urlInfo = url.split('?')
        if (urlInfo.length > 1) {
            var qbody = querystring.parse(urlInfo[1])
            for (var key in qbody) {
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
        var mimeType = mime.lookup(filePath)
        var stat = fs.statSync(filePath)
        var userAgent = (app.req.headers['user-agent'] || '').toLowerCase()
        var options = {
            'Content-Type': mimeType
        }
        var disposition = "attachment"
        if (forceDownload !== '1') {
            disposition = "inline"
        }
        var encodeFileName = encodeURIComponent(fileName)
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
        var error = {
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
HttpUtils.prototype.throw = function(app, statusCode, error, description) {
        var error = {
            code: statusCode,
            error: error,
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
HttpUtils.prototype.throw409 = function(app, error, description) {
        var error = {
            code: 409,
            error: error,
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
        var url = app.request.url
            // /api/v1/oauth2/token->oauth2/token
        var functionName = url.substring(8, url.length)
        var errors = {
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
        var socket = global.config.socket
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
