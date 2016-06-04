    exports.init = function(socket) {
        let router = 'minicloud id valid'
            //minicloud id valid
        socket.on(router, function(data) { 
            global.config.minicloud_valid = data.success
        })
    }
