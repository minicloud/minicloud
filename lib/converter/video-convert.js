    const path = require('path')
    const S = require('string')
    const fs = require('fs')
    const mime = require('../utils/file-mime')
    const mkdirp = require('mkdirp')
    const os = require('os')
    const FileUtils = require('../utils/file-utils').FileUtils
    let fileUtils = new FileUtils()
    const exec = require('child_process').exec
    const querystring = require('querystring')
    const request = require('co-request')
    Array.prototype.remove = function(index) {
            for (let i = 0; i < this.length; i++) {
                let item = this[i]
                if (i === index) {
                    this.splice(i, 1)
                    return true
                }
            }
            return false
        }
        /**
         * video convert
         * @param {String} logger 
         * @param {String} convertPath   
         * @param {String} cachePath  
         * @api public
         */
    let VideoConvert = function(logger, convertPath, cachePath) {
            this.convertPath = convertPath
            this.cachePath = cachePath
            this.logger = logger
            this.convertQueue = []
            this.convertDoing = false
            let self = this
            setInterval(function() {
                self.__videoConvertConsumer()
            }, 200)
        }
        /**
         * add video convert task
         * @param {String} videoPath 
         * @param {Object} param    
         * @api public
         */
    VideoConvert.prototype.addTask = function(videoPath, param) {
            this.convertQueue.push({
                source: videoPath,
                param: param
            })
        }
        /**
         * convert file start callback  
         * @api private
         */
    VideoConvert.prototype.__startCallback = function(task) {
            let logger = global.config.logger
            let param = task.param
            let callback = param.video_convert_start_callback
            callback = JSON.parse(new Buffer(callback, 'base64').toString())
            let url = callback.callbackUrl
            let body = callback.callbackBody
            body = querystring.parse(body)
            for (let key in body) {
                let value = body[key]
                value = value.replace('${etag}', param.hash)
                body[key] = value
            }
            logger.info({
                'current convert': task.source
            })
            require('co').wrap(function*() {
                yield request.post(url, { form: body })
            })()
        }
        /**
         * convert file end callback  
         * @api private
         */
    VideoConvert.prototype.__endCallback = function(task, success) {
            let logger = global.config.logger
            let param = task.param
            let callback = param.video_convert_end_callback
            callback = JSON.parse(new Buffer(callback, 'base64').toString())
            let url = callback.callbackUrl
            let body = callback.callbackBody
            body = querystring.parse(body)
            for (let key in body) {
                let value = body[key]
                value = value.replace('${etag}', param.hash)
                value = value.replace('${success}', success ? '1' : '0')
                body[key] = value
            }
            logger.info({
                'end convert': task.source,
                'success': success
            })
            require('co').wrap(function*() {
                yield request.post(url, { form: body })
            })()
        }
        /**
         * convert video to mp4 file  
         * @api private
         */
    VideoConvert.prototype.__videoConvertConsumer = function() {
            if (this.convertQueue.length === 0 || this.convertDoing) return
            this.convertDoing = true
            let task = this.convertQueue[0]
            let key = task.param.key
            let sourcePath = task.source
            let startCallback = this.__startCallback
            let endCallback = this.__endCallback
                //begin convert task
            startCallback(task)
                //create cache mp4 folder
            let self = this
            let aimPath = path.join(self.cachePath, key)
            let parentPath = path.dirname(aimPath)
            if (!fileUtils.exists(parentPath)) {
                mkdirp.sync(parentPath)
            }
            let mimeType = mime.lookup(key)
            if (mimeType !== 'video/mp4') {
                let basename = path.basename(key)
                let mp4Path = path.join(parentPath, basename + '.mp4')

                let cmd = '"' + this.convertPath + '" -i "' + sourcePath + '" "' + mp4Path + '"'
                let osName = os.platform()
                if (osName === 'linux') {
                    cmd = '"' + this.convertPath + '" -i "' + sourcePath + '" -c:v libx264 -strict -2  "' + mp4Path + '"'
                }
                let mp4Command = exec(cmd, { timeout: 120000 * 15 }, function(error, stdout, stderr) {})
                mp4Command.on("close", function(code, signal) {
                    //remove task
                    self.convertQueue.remove(0)
                    self.convertDoing = false
                    if (fileUtils.exists(mp4Path)) {
                        //mp4 cover jpg
                        self.__cover(parentPath, key, mp4Path, function(success) {
                            endCallback(task, true)
                        })
                    } else {
                        //fail convert
                        endCallback(task, false)
                    }
                })
            } else {
                //remove task,next task
                self.convertQueue.remove(0)
                self.convertDoing = false
                self.__cover(parentPath, key, sourcePath, function(success) {
                    endCallback(task, success)
                })
            }
        }
        /**
         * get mp4 cover  
         * @api private
         */
    VideoConvert.prototype.__cover = function(cacheParentPath, key, mp4Path, callback) {
            let basename = path.basename(key)
            let coverJpgPath = path.join(cacheParentPath, basename + '.jpg')
            cmd = '"' + this.convertPath + '" -i ' +'"'+ mp4Path + '" -y -f image2 -ss 00:00:01 -t 0.002 "' + coverJpgPath+'"'
            let coverCommand = exec(cmd, { timeout: 120000 }, function(error, stdout, stderr) {})
            coverCommand.on("close", function(code, signal) {
                if (fileUtils.exists(coverJpgPath)) {
                    callback(true, coverJpgPath)
                } else {
                    callback(false)
                }
            })
        }
        /**
         * return video cover path
         * @param {String} key  
         * @api public
         */
    VideoConvert.prototype.getCoverPath = function(key) {
            let aimPath = path.join(this.cachePath, key)
            let parentPath = path.dirname(aimPath)
            let basename = path.basename(key)
            let jpgPath = path.join(parentPath, basename + '.jpg')
            let self = this
            return function(done) {
                if (!fileUtils.exists(jpgPath)) {
                    let mimeType = mime.lookup(key)||''
                    if (mimeType.indexOf('video')>=0) {
                        //create mp4 file cover
                        let sourcePath = fileUtils.getSavePath(key)
                        if (!fileUtils.exists(sourcePath)) {
                            return done(null, null)
                        }
                        let aimPath = path.join(self.cachePath, key)
                        let parentPath = path.dirname(aimPath)
                        if (!fileUtils.exists(parentPath)) {
                            mkdirp.sync(parentPath)
                        }
                        self.__cover(parentPath, key, sourcePath, function(success, coverJpgPath) {
                            return done(null, coverJpgPath)
                        })
                    }
                } else {
                    return done(null, jpgPath)
                }
            }
        }
        /**
         * return video content path
         * @param {String} key  
         * @api public
         */
    VideoConvert.prototype.getContentPath = function(key) {
        let extname = path.extname(key)
        let aimPath = path.join(this.cachePath, key)
        let parentPath = path.dirname(aimPath)
        return path.join(parentPath, path.basename(key) + '.mp4')
    }
    exports.VideoConvert = VideoConvert
