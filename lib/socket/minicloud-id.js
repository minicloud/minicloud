    var HttpUtils = require('../utils/http-utils').HttpUtils
    var httpUtils = new HttpUtils()
    exports.init = function(socket) {
        var router = 'minicloud id'
            //send to minicloud.io id
        socket.on(router, function(data) {
            var token = global.config.access_token
            if (token) {
                var localTime = new Date().getTime()
                socket.emit(router, { key: token.key, local_time: localTime, disk: global.config.disk, plugin_info: httpUtils.getPluginInfo() })
            }
        })
    }