    const HttpUtils = require('../utils/http-utils').HttpUtils
    let httpUtils = new HttpUtils()
    exports.init = function(socket) {
        let router = 'minicloud id'
            //send to minicloud.io id
        socket.on(router, function(data) {
            let token = global.config.access_token
            if (token) {
                let localTime = new Date().getTime()
                socket.emit(router, { key: token.key, local_time: localTime, disk: global.config.disk, plugin_info: httpUtils.getPluginInfo() })
            }
        })
    }