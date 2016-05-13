    var path = require('path')
    var S = require('string')
    var fs = require('fs')
    var mkdirp = require('mkdirp')
    var mime = require('mime')
    var os = require('os')
    var FileUtils = require('../utils/file-utils').FileUtils
    var fileUtils = new FileUtils()
    var querystring = require('querystring')
    var request = require('co-request')
    const exec = require('child_process').exec
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
         * document convert
         * @param {String} logger 
         * @param {String} docPath   
         * @param {String} gsPath 
         * @param {String} cachePath   
         * @api public
         */
    var DocConvert = function(logger, docPath, gsPath, cachePath) {
            this.docPath = docPath
            this.gsPath = gsPath
            this.cachePath = cachePath
            this.logger = logger
            this.docConvertQueue = []
            this.pdfConvertQueue = []
            this.docConvertDoing = false
            this.pdfConvertDoing = false
            var self = this
            setInterval(function() {
                self.__docConvertConsumer()
            }, 200)
            setInterval(function() {
                self.__pdfConvertConsumer()
            }, 200)
        }
        /**
         * add task
         * @param {String} docPath 
         * @param {Object} param   
         * @param {String} startCallback 
         * @param {String} endCallback   
         * @api public
         */
    DocConvert.prototype.addTask = function(docPath, param) {
            this.docConvertQueue.push({
                source: docPath,
                param: param
            })
        }
        /**
         * convert file start callback  
         * @api private
         */
    DocConvert.prototype.__startCallback = function(task) {
            var logger = global.config.logger
            var param = task.param
            var callback = param.doc_convert_start_callback
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
    DocConvert.prototype.__endCallback = function(task, success) {
            var logger = global.config.logger
            var param = task.param
            var callback = param.doc_convert_end_callback
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
         * doc to pdf consumer 
         * @api private
         */
    DocConvert.prototype.__docConvertConsumer = function() {
            if (this.docConvertQueue.length === 0 || this.docConvertDoing) return
            this.docConvertDoing = true
            var task = this.docConvertQueue[0]
            var key = task.param.key
            var sourcePath = task.source
            var startCallback = this.__startCallback
            var endCallback = this.__endCallback
                //start task
            startCallback(task)

            var self = this
            var aimPath = path.join(self.cachePath, key)
            var parentPath = path.dirname(aimPath)
            if (!fs.existsSync(parentPath)) {
                mkdirp.sync(parentPath)
            }
            var mimeType = mime.lookup(key)
            if (mimeType !== 'application/pdf') {
                var osName = os.platform()
                var cmd = null
                if (osName === 'win32') {
                    var cmd = '"' + this.docPath + '" --convert-to pdf:writer_pdf_Export --outdir "' + global.config.temp_path + '" "' + sourcePath + '"'
                } else if (osName === 'linux') {
                    cmd = '"' + this.docPath + '" --headless --convert-to pdf --outdir "' + global.config.temp_path + '" "' + sourcePath + '"'
                }
                var pdfCommand = exec(cmd, { timeout: 120000 }, function(error, stdout, stderr) {})
                pdfCommand.on("close", function(code, signal) {
                    //remove task,start next task
                    self.docConvertQueue.remove(0)
                    self.docConvertDoing = false
                    var extname = path.extname(key)
                    var basename = path.basename(key, extname)
                    var tempPdfPath = path.join(global.config.temp_path, basename + '.pdf')
                    if (fs.existsSync(tempPdfPath)) {
                        //把pdf文件由临时目录转移到正式环境下
                        //为什么要在临时文件夹去转一次，是由于LibreOffice强制抹掉了文件后缀，无法区分pptx,ppt
                        var pdfPath = path.join(parentPath, path.basename(key) + '.pdf')
                        fileUtils.moveFile(tempPdfPath, pdfPath, function() {
                            self.pdfConvertQueue.push({
                                source: sourcePath,
                                pdfPath: pdfPath,
                                param: task.param
                            })
                        })
                    } else {
                        endCallback(task, false)
                    }
                })
            } else {
                //remove task,start next task
                self.docConvertQueue.remove(0)
                self.docConvertDoing = false
                self.pdfConvertQueue.push({
                    source: sourcePath,
                    pdfPath: sourcePath,
                    param: task.param
                })
            }

        }
        /**
         * pdf to png consumer 
         * @api public
         */
    DocConvert.prototype.__pdfConvertConsumer = function() {
            if (this.pdfConvertQueue.length === 0 || this.pdfConvertDoing) return
            this.pdfConvertDoing = true
            var task = this.pdfConvertQueue[0]
            var pdfPath = task.pdfPath
            var key = task.param.key
            var sourcePath = task.source
            var endCallback = this.__endCallback
                //create cache folder
            var self = this
            var aimPath = path.join(self.cachePath, key)
            var parentPath = path.dirname(aimPath)
            if (!fs.existsSync(parentPath)) {
                mkdirp.sync(parentPath)
            }
            var basename = path.basename(key)
            var pngPath = path.join(parentPath, basename + '-miniyun-images')
            if (!fs.existsSync(pngPath)) {
                mkdirp.sync(pngPath)
            }

            cmd = this.gsPath + ' -sDEVICE=pngalpha -o "' + path.join(pngPath, '%d.png') + '" "' + pdfPath + '"'
            var pngCommand = exec(cmd, { timeout: 120000 }, function(error, stdout, stderr) {})
            pngCommand.on("close", function(code, signal) {
                self.pdfConvertQueue.remove(0)
                self.pdfConvertDoing = false
                endCallback(task, true)
            })
        }
        /**
         * return doc cover path
         * @param {String} key  
         * @api public
         */
    DocConvert.prototype.getCoverPath = function(key) {
            var aimPath = path.join(this.cachePath, key)
            var parentPath = path.dirname(aimPath)
            var basename = path.basename(key)
            var pngFolderPath = path.join(parentPath, basename + '-miniyun-images')
            return path.join(pngFolderPath, '1.png')
        }
        /**
         * return doc pdf path
         * @param {String} key  
         * @api public
         */
    DocConvert.prototype.getPdfPath = function(key) {
        var extname = path.extname(key)
        var pdfPath = null
        if (extname !== '.pdf') {
            var aimPath = path.join(this.cachePath, key)
            var parentPath = path.dirname(aimPath)
            pdfPath = path.join(parentPath, path.basename(key) + '.pdf')
        } else {
            pdfPath = fileUtils.getSavePath(key)
        }
        return pdfPath
    }
    exports.DocConvert = DocConvert
