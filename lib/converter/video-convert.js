    var path = require('path')
    var S = require('string')
    var fs = require('fs')
    var mime = require('mime')
    var mkdirp = require('mkdirp')
    var os = require('os')
    var FileUtils = require('../utils/file-utils').FileUtils
    var fileUtils = new FileUtils()
    const exec = require('child_process').exec
    var querystring = require('querystring')
    var request = require('co-request')
    Array.prototype.remove = function(index) {
            for (var i = 0; i < this.length; i++) {
                var item = this[i]
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
    var VideoConvert = function(logger, convertPath, cachePath) {
            this.convertPath = convertPath
            this.cachePath = cachePath
            this.logger = logger
            this.convertQueue = []
            this.convertDoing = false
            var self = this
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
            var logger = global.config.logger
            var param = task.param
            var callback = param.video_convert_start_callback
            callback = JSON.parse(new Buffer(callback, 'base64').toString())
            var url = callback.callbackUrl
            var body = callback.callbackBody
            body = querystring.parse(body)
            for (var key in body) {
                var value = body[key]
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
            var logger = global.config.logger
            var param = task.param
            var callback = param.video_convert_end_callback
            callback = JSON.parse(new Buffer(callback, 'base64').toString())
            var url = callback.callbackUrl
            var body = callback.callbackBody
            body = querystring.parse(body)
            for (var key in body) {
                var value = body[key]
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
            var task = this.convertQueue[0]
            var key = task.param.key
            var sourcePath = task.source
            var startCallback = this.__startCallback
            var endCallback = this.__endCallback
                //begin convert task
            startCallback(task)
                //create cache mp4 folder
            var self = this
            var aimPath = path.join(self.cachePath, key)
            var parentPath = path.dirname(aimPath)
            if (!fs.existsSync(parentPath)) {
                mkdirp.sync(parentPath)
            }
            var mimeType = mime.lookup(key)
            if (mimeType !== 'video/mp4') {
                var basename = path.basename(key)
                var mp4Path = path.join(parentPath, basename + '.mp4')

                var cmd = '"' + this.convertPath + '" -i "' + sourcePath + '" "' + mp4Path + '"'
                var osName = os.platform()
                if (osName === 'linux') {
                    cmd = '"' + this.convertPath + '" -i "' + sourcePath + '" -c:v libx264 -strict -2  "' + mp4Path + '"'
                }
                var mp4Command = exec(cmd, { timeout: 120000 * 15 }, function(error, stdout, stderr) {})
                mp4Command.on("close", function(code, signal) {
                    //remove task
                    self.convertQueue.remove(0)
                    self.convertDoing = false
                    if (fs.existsSync(mp4Path)) {
                        //mp4 cover jpg
                        self.__cover(parentPath, key, mp4Path, function(success) {
                            endCallback(task, success)
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
            var basename = path.basename(key)
            var coverJpgPath = path.join(cacheParentPath, basename + '.jpg')
            cmd = '"' + this.convertPath + '" -i ' + mp4Path + ' -y -f image2 -ss 8 -t 0.002 -s 350x240 ' + coverJpgPath
            var coverCommand = exec(cmd, { timeout: 120000 }, function(error, stdout, stderr) {})
            coverCommand.on("close", function(code, signal) {
                if (fs.existsSync(coverJpgPath)) {
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
            var aimPath = path.join(this.cachePath, key)
            var parentPath = path.dirname(aimPath)
            var basename = path.basename(key)
            var jpgPath = path.join(parentPath, basename + '.jpg')
            var self = this
            return function(done) {
                if (!fs.existsSync(jpgPath)) {
                    var mimeType = mime.lookup(key)
                    if (mimeType == 'video/mp4') {
                        //create mp4 file cover
                        var sourcePath = fileUtils.getSavePath(key)
                        if (!fs.existsSync(sourcePath)) {
                            return done(null, null)
                        }
                        var aimPath = path.join(self.cachePath, key)
                        var parentPath = path.dirname(aimPath)
                        if (!fs.existsSync(parentPath)) {
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
        var extname = path.extname(key)
        var aimPath = path.join(this.cachePath, key)
        var parentPath = path.dirname(aimPath)
        return path.join(parentPath, path.basename(key) + '.mp4')
    }
    exports.VideoConvert = VideoConvert
