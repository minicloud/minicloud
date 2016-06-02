   const MiniConfig = require('../model/config')
   exports.init = function(socket) {
       let router = 'video change status'
           //mp4 change status
       socket.on(router, function(data) {
           let status = data.status
           require('co').wrap(function*() {
               yield MiniConfig.saveVideoStatus(status)
               status = global.config.video_status
               socket.emit(router, {
                   success: true,
                   status: status
               })
           })()
       })
   }
