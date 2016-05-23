//return network status
exports.network = function*() {
        let networkStatus = global.config.net_status
        this.body = {
            status: networkStatus
        }
    }
    //return active status
exports.active = function*() {
        let actived = false
        let accessToken = global.config.access_token
        if (typeof(accessToken) !== 'undefined' && accessToken.secret) {
            actived = true
        }
        this.body = {
            status: actived
        }
    }
    //return app version 
exports.version = function*() {
        this.body = {
            version: global.config.version
        }
    }
    //return plugin status
exports.plugin = function*() {
        var body = {}
        var vc = global.config.plugins.vc
        if (vc) {
            body['video'] = true
        } else {
            body['video'] = false
        }
        var dc = global.config.plugins.dc
        if (dc) {
            body['doc'] = true
        } else {
            body['doc'] = false
        }
        this.body = body
    }
    //return disk status
exports.disk = function*() {
        this.body = global.config.disk
    }
    //return folder status
exports.folder = function*() {
    var body = []
    var folder = global.config.folder
    if (folder) {
        body = folder
    }
    this.body = body
}
