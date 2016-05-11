var fs = require('fs')
var path = require('path')
var uuid = require('node-uuid')
var SocketSyncFolder = function() {

}
SocketSyncFolder.prototype.start = function() {
        this.isStating = false
        this.isConsuming = false
        this.changeConfig = false
        this.maxSize = 300
        this.queue = []
        var self = this
        setInterval(function() {
            self.__stat()
        }, 200)
        setInterval(function() {
            self.__consumer()
        }, 200)
    }
    //sync file to minicloud.io
SocketSyncFolder.prototype.__consumer = function() {
        var socket = global.config.socket
        if (!socket) return
        if (this.isConsuming) return
        if (this.queue.length > 0) {
            this.changeConfig = true
            this.isConsuming = true
            var self = this
                //sync 20 file to minicloud.io
            var syncQueue = self.queue.splice(0, self.maxSize)
            socket.emit('sync old file', syncQueue)
            socket.on('sync old file', function(error) {
                //next array files
                self.isConsuming = false
            })
        } else {
            if (this.changeConfig) {
                //save status to config.json
                var folders = global.config.folder
                for (var i = 0; i < folders.length; i++) {
                    var folder = folders[i]
                    folder.status = 2
                }
                var MiniConfig = require('../model/config')
                MiniConfig.saveFolderStatus()
                this.changeConfig = false
            }
        }
    }
    //stat all folders
SocketSyncFolder.prototype.__stat = function() {
        var socket = global.config.socket
        if (!socket) return
        if (this.isStating) return
        this.isStating = true
        var folders = global.config.folder
        if (folders) {
            for (var i = 0; i < folders.length; i++) {
                var folder = folders[i]
                var folderPath = folder.path
                var syncStatus = folder.status
                if (typeof(syncStatus) === 'undefined') {
                    this.__statSyncFolder(folderPath, folderPath)
                    folder.status = 1
                }
            }
        }
        this.isStating = false
    }
    //stat folders
SocketSyncFolder.prototype.__statSyncFolder = function(rootPath, folderPath) {
    var rootParentPath = path.dirname(rootPath)
    var subFiles = fs.readdirSync(folderPath)
    var subFolders = []
    for (var i = 0; i < subFiles.length; i++) {
        var fileName = subFiles[i]
        if (fileName === 'Thumbs.db') {
            continue
        }
        var subFilePath = path.join(folderPath, subFiles[i])
        var stat = fs.statSync(subFilePath)
        if (stat.isFile()) {
            var bucketPath = subFilePath.substring(rootParentPath.length, subFilePath.length)
                //add to queue
            this.queue.push({
                root_path: rootPath,
                size: stat.size,
                hash: uuid.v4(),
                bucket_path: bucketPath
            })
        }
        if (stat.isDirectory()) {
            subFolders.push(subFilePath)
        }
    }
    for (var i = 0; i < subFolders.length; i++) {
        this.__statSyncFolder(rootPath, subFolders[i])
    }
}
exports.SocketSyncFolder = SocketSyncFolder
