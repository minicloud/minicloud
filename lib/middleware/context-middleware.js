var querystring = require('querystring')
var HttpUtils = require('../utils/http-utils').HttpUtils
var httpUtils = new HttpUtils()
var crypto = require('crypto')
    /**
     * return request body
     * @param {Object} app    
     * @api privater
     */
var __getBody = function(app) {
        var body = app.request.body
        if (!body) {
            body = {}
            app.request.body = body
        }
        var url = app.request.url
        var urlInfo = url.split('?')
        if (urlInfo.length > 1) {
            var qbody = querystring.parse(urlInfo[1])
            for (var key in qbody) {
                body[key] = qbody[key]
            }
        }
        return body
    }
    /**
     * set global variables to request 
     * @param {Object} opts 
     * @api public
     */
module.exports = function(opts) {
    return function*(next) {
        var body = __getBody(this)
            //upload file request
        var url = this.request.url
        var isUpload = url.indexOf('/api/v1/file/upload') === 0 ? true : false
        if (!isUpload) {
            //normal request
            var signature = opts.signature
            if (signature !== false) {
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
                    //set file key to body
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
            }
        }
        yield * next
    }
}
