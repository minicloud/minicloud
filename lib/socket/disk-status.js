    exports.init = function(socket) {
        let router = 'disk status'
            //disk status
        socket.on(router, function(data) {
            let disk = global.config.disk || {}
            socket.emit(router, {
                success: true,
                disk: disk
            })
        })
    }
