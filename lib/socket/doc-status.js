    exports.init = function(socket) {
        let router = 'doc status'
            //doc status
        socket.on(router, function(data) {
            let status = false
            let doc = global.config.doc_status
            if (typeof(doc) !== 'undefined') {
                status = global.config.doc_status
            }
            socket.emit(router, {
                status: status
            })
        })
    }
