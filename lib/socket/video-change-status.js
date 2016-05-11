   var MiniConfig = require('../model/config')
   exports.init = function(socket) {
       var router = 'video change status'
           //mp4 change status
       socket.on(router, function(data) {
           var status = data.status
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
