var MiniConfig = require('../model/config')
var fs = require('fs')
var path = require('path')
    /**
     * valid path
     * @param {String} folderPath  
     * @return {Boolean} 
     * @api private
     */
var __validPath = function(folderPath) {
        if (!fs.existsSync(folderPath)) {
            return false
        }
        var stat = fs.statSync(folderPath)
        if (!stat.isDirectory()) {
            return false
        }
        var testFile = path.join(folderPath, 'test.txt')
            //can write
        fs.writeFileSync(testFile, '1111')
        fs.unlinkSync(testFile)
        return true
    }
    /**
     * init socket
     * @param {Object} socket  
     * @return null 
     * @api public
     */
exports.init = function(socket) {
    var router = 'disk create'
        //disk create
    socket.on(router, function(data) {
        var valid = __validPath(data.path)
        if (!valid) {
            socket.emit(router, {
                success: false,
                msg: 'path invalid or path not existed or path not write'
            })
        } else {
            MiniConfig.createDisk(data)
            socket.emit(router, {
                success: true,
                disk: global.config.disk
            })
        }
    })
}
