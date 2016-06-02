    const path = require('path')
    const S = require('string')
    const fs = require('fs')
    const mkdirp = require('mkdirp')
    const mime = require('mime')
    const os = require('os')
    const FileUtils = require('../utils/file-utils').FileUtils
    let fileUtils = new FileUtils()
    const querystring = require('querystring')
    const request = require('co-request')
    const exec = require('child_process').exec
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
         * document convert
         * @param {String} logger 
         * @param {String} docPath   
         * @param {String} gsPath 
         * @param {String} cachePath   
         * @api public
         */
    let DocConvert = function(logger, docPath, gsPath, cachePath) {
            this.docPath = docPath
            this.gsPath = gsPath
            this.cachePath = cachePath
            this.logger = logger
            this.docConvertQueue = []
            this.pdfConvertQueue = []
            this.docConvertDoing = false
            this.pdfConvertDoing = false
            let self = this
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
            let logger = global.config.logger
            let param = task.param
            let callback = param.doc_convert_start_callback
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
    DocConvert.prototype.__endCallback = function(task, success) {
            let logger = global.config.logger
            let param = task.param
            let callback = param.doc_convert_end_callback
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
         * doc to pdf consumer 
         * @api private
         */
    DocConvert.prototype.__docConvertConsumer = function() {
            if (this.docConvertQueue.length === 0 || this.docConvertDoing) return
            this.docConvertDoing = true
            let task = this.docConvertQueue[0]
            let key = task.param.key
            let sourcePath = task.source
            let startCallback = this.__startCallback
            let endCallback = this.__endCallback
                //start task
            startCallback(task)

            let self = this
            let aimPath = path.join(self.cachePath, key)
            let parentPath = path.dirname(aimPath)
            if (!fs.existsSync(parentPath)) {
                mkdirp.sync(parentPath)
            }
            let mimeType = mime.lookup(key)
            if (mimeType !== 'application/pdf') {
                let osName = os.platform()
                let cmd = null
                if (osName === 'win32') {
                    let cmd = '"' + this.docPath + '" --convert-to pdf:writer_pdf_Export --outdir "' + global.config.temp_path + '" "' + sourcePath + '"'
                } else if (osName === 'linux') {
                    cmd = '"' + this.docPath + '" --headless --convert-to pdf --outdir "' + global.config.temp_path + '" "' + sourcePath + '"'
                }
                let pdfCommand = exec(cmd, { timeout: 120000 }, function(error, stdout, stderr) {})
                pdfCommand.on("close", function(code, signal) {
                    //remove task,start next task
                    self.docConvertQueue.remove(0)
                    self.docConvertDoing = false
                    let extname = path.extname(key)
                    let basename = path.basename(key, extname)
                    let tempPdfPath = path.join(global.config.temp_path, basename + '.pdf')
                    if (fs.existsSync(tempPdfPath)) {
                        //把pdf文件由临时目录转移到正式环境下
                        //为什么要在临时文件夹去转一次，是由于LibreOffice强制抹掉了文件后缀，无法区分pptx,ppt
                        let pdfPath = path.join(parentPath, path.basename(key) + '.pdf')
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
            let task = this.pdfConvertQueue[0]
            let pdfPath = task.pdfPath
            let key = task.param.key
            let sourcePath = task.source
            let endCallback = this.__endCallback
                //create cache folder
            let self = this
            let aimPath = path.join(self.cachePath, key)
            let parentPath = path.dirname(aimPath)
            if (!fs.existsSync(parentPath)) {
                mkdirp.sync(parentPath)
            }
            let basename = path.basename(key)
            let pngPath = path.join(parentPath, basename + '-miniyun-images')
            if (!fs.existsSync(pngPath)) {
                mkdirp.sync(pngPath)
            }

            cmd = '"' +this.gsPath + '" -sDEVICE=pngalpha -o "' + path.join(pngPath, '%d.png') + '" "' + pdfPath + '"'
            let pngCommand = exec(cmd, { timeout: 120000 }, function(error, stdout, stderr) {})
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
            let aimPath = path.join(this.cachePath, key)
            let parentPath = path.dirname(aimPath)
            let basename = path.basename(key)
            let pngFolderPath = path.join(parentPath, basename + '-miniyun-images')
            return path.join(pngFolderPath, '1.png')
        }
        /**
         * return doc pdf path
         * @param {String} key  
         * @api public
         */
    DocConvert.prototype.getPdfPath = function(key) {
        let extname = path.extname(key)
        let pdfPath = null
        if (extname !== '.pdf') {
            let aimPath = path.join(this.cachePath, key)
            let parentPath = path.dirname(aimPath)
            pdfPath = path.join(parentPath, path.basename(key) + '.pdf')
        } else {
            pdfPath = fileUtils.getSavePath(key)
        }
        return pdfPath
    }
    exports.DocConvert = DocConvert
