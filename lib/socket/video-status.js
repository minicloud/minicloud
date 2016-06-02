    exports.init = function(socket) {
        let router = 'video status'
            //mp4 status
        socket.on(router, function(data) {
            let status = false
            let mp4 = global.config.video_status
            if (typeof(mp4) !== 'undefined') {
                status = global.config.video_status
            }
            socket.emit(router, {
                status: status
            })
        })
    }
