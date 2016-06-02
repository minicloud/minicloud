const MiniConfig = require('../model/config')
const fs = require('fs')
const path = require('path')
const FileUtils = require('../utils/file-utils').FileUtils
let fileUtils = new FileUtils()
    /**
     * valid path
     * @param {String} folderPath  
     * @return {Boolean} 
     * @api private
     */
let __validPath = function(folderPath) {
        if (!fileUtils.exists(folderPath)) {
            return false
        }
        let stat = fs.statSync(folderPath)
        if (!stat.isDirectory()) {
            return false
        }
        return true
    }
    /**
     * init socket
     * @param {Object} socket  
     * @return null 
     * @api public
     */
exports.init = function(socket) {
    let router = 'folder create'
        //folder create
    socket.on(router, function(data) {
        let valid = __validPath(data.path)
        if (!valid) {
            socket.emit(router, {
                success: false,
                msg: 'path invalid or path not existed'
            })
        } else {
            MiniConfig.createFolder(data)
            socket.emit(router, {
                success: true,
                folder: global.config.folder
            })
        }
    })
}
