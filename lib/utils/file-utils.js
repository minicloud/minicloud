var path = require('path')
var fs = require('fs')
    /**
     * file utils
     * @api public
     */
var FileUtils = function() {

    }
    /**
     * return random number
     * @param {Array} disks    
     * @api public
     */
FileUtils.prototype.getRandomNum = function(disks) {
        return (Math.floor(Math.random() * disks.length)) % disks.length
    }
    /**
     * return new file save path
     * @param {String} username     
     * @api public
     */
FileUtils.prototype.newSavePath = function(username) {
        var disks = global.config.disk
            //first look old folder
        for (var i = 0; i < disks.length; i++) {
            var disk = disks[i]
            var diskPath = disk.path
            var rootPath = path.join(diskPath, 'minicloud', username)
            if (fs.existsSync(rootPath)) {
                return {
                    root_path: diskPath,
                    temp_path: path.join(diskPath, 'temp')
                }
            }
        }
        //select random disk
        var pos = this.getRandomNum(disks)
        var diskPath = disks[pos].path
        return {
            root_path: diskPath,
            temp_path: path.join(diskPath, 'temp')
        }
    }
    /**
     * return old file save path
     * @param {String} key     
     * @api public
     */
FileUtils.prototype.getSavePath = function(key) {
        //new file
        var disks = global.config.disk
        for (var i = 0; i < disks.length; i++) {
            var diskInfo = disks[i]
            var filePath = path.join(diskInfo['path'], key)
            if (fs.existsSync(filePath)) {
                return filePath
            }
        }
        var fileAbPath = ''
        var infos = key.split('/')
        if (key.indexOf('minicloud') === 0) {
            if (infos.length > 3) {
                //old file
                fileAbPath = infos.slice(3, infos.length).join('/')
            }
        } else {
            fileAbPath = infos.slice(2, infos.length).join('/')
        }
        var folders = global.config.folder
        for (var i = 0; i < folders.length; i++) {
            var folder = folders[i]
            var filePath = path.join(folder.path, fileAbPath)
            if (fs.existsSync(filePath)) {
                return filePath
            }
        }
        return null
    }
    /**
     * move file
     * @param {String} key     
     * @api public
     */
FileUtils.prototype.moveFile = function(tmpFilePath, localPath, callback) {
    fs.rename(tmpFilePath, localPath, function(error) {
        if (error) {
            var readStream = fs.createReadStream(tmpFilePath)
            var writeFile = fs.createWriteStream(localPath);
            readStream.pipe(writeFile);
            readStream.on("end", function() {
                fs.unlinkSync(tmpFilePath)
                callback()
            })
        } else {
            callback()
        }
    })
}
exports.FileUtils = FileUtils
