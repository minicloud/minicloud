const HttpUtils = require('../../utils/http-utils').HttpUtils
let httpUtils = new HttpUtils()
const MiniConfig = require('../../model/config')
let os = require('os')
    /**
     * return minicloud info
     * @api private
     */
let __getNodeInfo = function() {
        return {
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            totalmem: os.totalmem(),
            uptime: os.uptime(),
            loadavg: os.loadavg(),
            freemem: os.freemem()
        }
    }
    /**
     * active minicloud,only once
     * @api public
     */
exports.active = function*() {
    this.checkBody('key').notEmpty('required field.')
    if (this.errors) {
        return httpUtils.throw400(this)
    }
    let body = this.request.body
    let key = body.key
    let token = global.config.access_token
    if (token && token.key) {
        if(token.key == key){
            return httpUtils.throw409(this, 'minicloud_actived', 'minicloud actived')
        }else{
            if(global.config.minicloud_valid){
                return httpUtils.throw409(this, 'minicloud_actived', 'minicloud actived')
            }
        }        
    }
    //to minicloud.io active minicloud
    let socket = global.config.socket
    if (!socket) {
        return httpUtils.throw409(this, 'not_connect_minicloud.io', 'not connect minicloud.io')
    }
    let data = {
        key: key,
        os_info: __getNodeInfo(),
        version: global.config.version,
        disk: global.config.disk,
        plugin_info: httpUtils.getPluginInfo()
    }
    data = yield httpUtils.socketRequest('active minicloud', data)
    if (data.success) {
        //save key to config.json
        MiniConfig.saveKey(key, data.secret)
        //modify valid status
        global.config.minicloud_valid = true
        this.body = ''
    } else {
        //invalid key
        return httpUtils.throw409(this, 'key_invalid', 'key invalid')
    }
}
