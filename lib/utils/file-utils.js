const path = require('path')
const fs = require('fs')
    /**
     * file utils
     * @api public
     */
let FileUtils = function() {

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
        let disks = global.config.disk
            //first look old folder
        for (let i = 0; i < disks.length; i++) {
            let disk = disks[i]
            let diskPath = disk.path
            let rootPath = path.join(diskPath, 'minicloud', username)
            if (fs.existsSync(rootPath)) {
                return {
                    root_path: diskPath,
                    temp_path: path.join(diskPath, 'temp')
                }
            }
        }
        //select random disk
        let pos = this.getRandomNum(disks)
        let diskPath = disks[pos].path
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
        let disks = global.config.disk
        for (let i = 0; i < disks.length; i++) {
            let diskInfo = disks[i]
            let filePath = path.join(diskInfo['path'], key)
            if (fs.existsSync(filePath)) {
                return filePath
            }
        }
        let fileAbPath = ''
        let infos = key.split('/')
        if (key.indexOf('minicloud') === 0) {
            if (infos.length > 3) {
                //old file
                fileAbPath = infos.slice(3, infos.length).join('/')
            }
        } else {
            fileAbPath = infos.slice(2, infos.length).join('/')
        }
        let folders = global.config.folder
        if (typeof(folders) != 'undefined') {
            for (let i = 0; i < folders.length; i++) {
                let folder = folders[i]
                let filePath = path.join(folder.path, fileAbPath)
                if (fs.existsSync(filePath)) {
                    return filePath
                }
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
            let readStream = fs.createReadStream(tmpFilePath)
            let writeFile = fs.createWriteStream(localPath);
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
