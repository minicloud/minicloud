const querystring = require('querystring')
const HttpUtils = require('../utils/http-utils').HttpUtils
let httpUtils = new HttpUtils()
const crypto = require('crypto')
    /**
     * return request body
     * @param {Object} app    
     * @api privater
     */
let __getBody = function(app) {
        let body = app.request.body
        if (!body) {
            body = {}
            app.request.body = body
        }
        let url = app.request.url
        let urlInfo = url.split('?')
        if (urlInfo.length > 1) {
            let qbody = querystring.parse(urlInfo[1])
            for (let key in qbody) {
                body[key] = qbody[key]
            }
        }
        return body
    }
    /**
     * set global letiables to request 
     * @param {Object} opts 
     * @api public
     */
module.exports = function(opts) {
    return function*(next) {
        let body = __getBody(this)
            //upload file request
        let url = this.request.url
        let isUpload = url.indexOf('/api/v1/file/upload') === 0 ? true : false
        if (!isUpload) {
            //normal request
            let signature = opts.signature
            if (signature !== false) {
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
                    //set file key to body
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
            }
        }
        //only 127.0.0.1 can visit
        let range = opts.range
        if (range) {
            let ip = this.ip 
            if (ip.indexOf('127.0.0.1')<0) {
                return httpUtils.throw409(this, 'invalid_ip', 'invalid ip')
            }
        }
        yield * next
    }
}
