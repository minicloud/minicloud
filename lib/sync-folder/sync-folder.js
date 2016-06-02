const fs = require('fs')
const path = require('path')
const uuid = require('node-uuid')
let SocketSyncFolder = function() {

}
SocketSyncFolder.prototype.start = function() {
        this.isStating = false
        this.isConsuming = false
        this.changeConfig = false
        this.maxSize = 300
        this.queue = []
        let self = this
        setInterval(function() {
            self.__stat()
        }, 200)
        setInterval(function() {
            self.__consumer()
        }, 200)
    }
    //sync file to minicloud.io
SocketSyncFolder.prototype.__consumer = function() {
        let socket = global.config.socket
        if (!socket) return
        if (this.isConsuming) return
        if (this.queue.length > 0) {
            this.changeConfig = true
            this.isConsuming = true
            let self = this
                //sync 20 file to minicloud.io
            let syncQueue = self.queue.splice(0, self.maxSize)
            socket.emit('sync old file', syncQueue)
            socket.on('sync old file', function(error) {
                //next array files
                self.isConsuming = false
            })
        } else {
            if (this.changeConfig) {
                //save status to config.json
                let folders = global.config.folder
                for (let i = 0; i < folders.length; i++) {
                    let folder = folders[i]
                    folder.status = 2
                }
                let MiniConfig = require('../model/config')
                MiniConfig.saveFolderStatus()
                this.changeConfig = false
            }
        }
    }
    //stat all folders
SocketSyncFolder.prototype.__stat = function() {
        let socket = global.config.socket
        if (!socket) return
        if (this.isStating) return
        this.isStating = true
        let folders = global.config.folder
        if (folders) {
            for (let i = 0; i < folders.length; i++) {
                let folder = folders[i]
                let folderPath = folder.path
                let syncStatus = folder.status
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
    let rootParentPath = path.dirname(rootPath)
    let subFiles = fs.readdirSync(folderPath)
    let subFolders = []
    for (let i = 0; i < subFiles.length; i++) {
        let fileName = subFiles[i]
        if (fileName === 'Thumbs.db') {
            continue
        }
        let subFilePath = path.join(folderPath, subFiles[i])
        let stat = fs.statSync(subFilePath)
        if (stat.isFile()) {
            let bucketPath = subFilePath.substring(rootParentPath.length, subFilePath.length)
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
    for (let i = 0; i < subFolders.length; i++) {
        this.__statSyncFolder(rootPath, subFolders[i])
    }
}
exports.SocketSyncFolder = SocketSyncFolder
