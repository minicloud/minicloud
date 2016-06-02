    exports.init = function(socket) {
        let router = 'folder status'
            //folder status
        socket.on(router, function(data) {
            let folder = global.config.folder || {}
            socket.emit(router, {
                success: true,
                folder: folder
            })
        })
    }
