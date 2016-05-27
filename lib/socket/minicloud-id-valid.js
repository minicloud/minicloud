    exports.init = function(socket) {
        var router = 'minicloud id valid'
            //minicloud id valid
        socket.on(router, function(data) { 
            global.config.minicloud_valid = data.status
        })
    }
