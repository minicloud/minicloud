    exports.init = function(socket) {
        var router = 'video status'
            //mp4 status
        socket.on(router, function(data) {
            var status = true
            var mp4 = global.config.video_status
            if (typeof(mp4) !== 'undefined') {
                status = global.config.video_status
            }
            socket.emit(router, {
                status: status
            })
        })
    }
