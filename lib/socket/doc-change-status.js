   let MiniConfig = require('../model/config')
   exports.init = function(socket) {
       let router = 'doc change status'
           //doc change status
       socket.on(router, function(data) {
           let status = data.status
           require('co').wrap(function*() {
               yield MiniConfig.saveDocStatus(status)
               status = global.config.doc_status
               socket.emit(router, {
                   success: true,
                   status: status
               })
           })()
       })
   }
