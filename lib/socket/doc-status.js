    exports.init = function(socket) {
        var router = 'doc status'
            //doc status
        socket.on(router, function(data) {
            var status = false
            var doc = global.config.doc_status
            if (typeof(doc) !== 'undefined') {
                status = global.config.doc_status
            }
            socket.emit(router, {
                status: status
            })
        })
    }
