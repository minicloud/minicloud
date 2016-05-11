    exports.init = function(socket) {
        var router = 'disk status'
            //disk status
        socket.on(router, function(data) {
            var disk = global.config.disk || {}
            socket.emit(router, {
                success: true,
                disk: disk
            })
        })
    }
