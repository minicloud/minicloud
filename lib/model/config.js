var fs = require('fs')
var path = require('path')
var plugin = require('./plugin')
var configFilePath = path.join(__dirname, '..', '..', 'config.json')
    //save old folder status to config.json
exports.saveFolderStatus = function() {
    var configObj = __getConfig()
    configObj.folder = global.config.folder
    fs.writeFileSync(configFilePath, JSON.stringify(configObj))
}
__getConfig = function() {
        if (fs.existsSync(configFilePath)) {
            return JSON.parse(fs.readFileSync(configFilePath))
        } else {
            return {}
        }
    }
    //save key to config.json
exports.saveKey = function(key, secret) {
        //modify file
        var configObj = __getConfig()
        var token = configObj.access_token
        if (!token) {
            token = {}
            configObj.access_token = token
        }
        token.key = key
        token.secret = secret
        fs.writeFileSync(configFilePath, JSON.stringify(configObj))
            //modify memery
        global.config.access_token = {
            key: key,
            secret: secret
        }
    }
    //save plugin doc status to config.json
exports.saveDocStatus = function*(status) {
        //modify file
        var configObj = __getConfig()
        if (status) {
            //if doc convert plugin not installed
            global.config.doc_status = true
            var dc = yield plugin.resetDoc()
            global.config.plugins.dc = dc
            if (!dc) {
                status = false
            }
        }
        configObj.doc_status = status
        fs.writeFileSync(configFilePath, JSON.stringify(configObj))
            //modify memery
        global.config.doc_status = status
    }
    //save plugin mp4 status to config.json
exports.saveVideoStatus = function*(status) {
        //modify file
        var configObj = __getConfig()
        if (status) {
            //if video convert plugin not installed
            global.config.video_status = true
            var vc = yield plugin.resetVideo() 
            global.config.plugins.vc = vc
            if (!vc) {
                status = false
            }
        }
        configObj.video_status = status
        fs.writeFileSync(configFilePath, JSON.stringify(configObj))
            //modify memery
        global.config.video_status = status
    }
    //create disk to config.json
exports.createDisk = function(newDisk) {
        //modify file
        var configObj = __getConfig()
        var disk = global.config.disk
        configObj.disk = disk
        var oldDisk = null
        for (var i = 0; i < disk.length; i++) {
            var item = disk[i]
            if (item.path === newDisk.path) {
                oldDisk = item
                break
            }
        }
        if (oldDisk) {
            oldDisk.size = newDisk.size
        } else {
            disk.push({
                path: newDisk.path,
                size: newDisk.size
            })
        }
        fs.writeFileSync(configFilePath, JSON.stringify(configObj))
            //modify memery
        global.config.disk = disk
    }
    //remove disk to config.json
exports.removeDisk = function(oldDisk) {
        //modify file
        var configObj = __getConfig()
        var disk = configObj.disk
        if (!disk) {
            disk = []
            configObj.disk = disk
        }
        var index = -1
        for (var i = 0; i < disk.length; i++) {
            var item = disk[i]
            if (item.path === oldDisk.path) {
                index = i
                break
            }
        }
        if (index !== -1) {
            disk.splice(index, 1)
        }
        fs.writeFileSync(configFilePath, JSON.stringify(configObj))
            //modify memery
        global.config.disk = disk
    }
    //create folder to config.json
exports.createFolder = function(newFolder) {
        //modify file
        var configObj = __getConfig()
        var folder = global.config.folder
        if (!folder) {
            folder = []
            global.config.folder = folder
        }
        configObj.folder = folder
        var oldFolder = null
        for (var i = 0; i < folder.length; i++) {
            var item = folder[i]
            if (item.path === newFolder.path) {
                oldFolder = item
                break
            }
        }
        if (!oldFolder) {
            folder.push({
                path: newFolder.path
            })
        }
        fs.writeFileSync(configFilePath, JSON.stringify(configObj))
            //modify memery
        global.config.folder = folder
    }
    //remove folder to config.json
exports.removeFolder = function(oldFolder) {
    //modify file
    var configObj = __getConfig()
    var folder = configObj.folder
    if (!folder) {
        folder = []
        configObj.folder = folder
    }
    var index = -1
    for (var i = 0; i < folder.length; i++) {
        var item = folder[i]
        if (item.path === oldFolder.path) {
            index = i
            break
        }
    }
    if (index !== -1) {
        folder.splice(index, 1)
    }
    fs.writeFileSync(configFilePath, JSON.stringify(configObj))
        //modify memery
    global.config.folder = folder
}
