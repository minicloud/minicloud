var MiniConfig = require('../model/config')
    /**
     * init socket
     * @param {Object} socket  
     * @return null 
     * @api public
     */
exports.init = function(socket) {
    var router = 'folder remove'
        //folder remove
    socket.on(router, function(data) {
        MiniConfig.removeFolder(data)
        socket.emit(router, {
            success:true,
            folder: global.config.folder
        })
    })
}
