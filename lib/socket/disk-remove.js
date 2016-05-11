var MiniConfig = require('../model/config')
    /**
     * init socket
     * @param {Object} socket  
     * @return null 
     * @api public
     */
exports.init = function(socket) {
    var router = 'disk remove'
        //disk remove
    socket.on(router, function(data) {
        MiniConfig.removeDisk(data)
        socket.emit(router, {
            success:true,
            disk: global.config.disk
        })
    })
}
