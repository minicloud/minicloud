    exports.init = function(socket) {
        var router = 'folder status'
            //folder status
        socket.on(router, function(data) {
            var folder = global.config.folder || {}
            socket.emit(router, {
                success: true,
                folder: folder
            })
        })
    }
