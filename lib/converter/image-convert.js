    const path = require('path')
    const S = require('string')
    const fs = require('fs')
    const mkdirp = require('mkdirp')
    const FileUtils = require('../utils/file-utils').FileUtils
    let fileUtils = new FileUtils()
        /**
         * image create thumbnail
         * @param {String} convertPath 
         * @param {String} identifyPath
         * @param {String} cachePath    
         * @api public
         */
    let ImageConvert = function(convertPath, identifyPath, cachePath) {
            const im = require('imagemagick')
            im.convert.path = convertPath
            im.identify.path = identifyPath
            this.im = im
            this.cachePath = cachePath
        }
        /**
         * return  thumbnail
         * @param {String} key 
         * @param {String} w    
         * @api public
         */
    ImageConvert.prototype.getThumbnailPath = function*(key, w) {
            //default 640x640
            if (isNaN(w)) {
                w = 640
            }
            let thumbnailPath = path.join(this.cachePath, key + '-' + w + 'x' + w)
            if (key.toLowerCase().indexOf('.gif')) {
                thumbnailPath += '-0'
            }
            thumbnailPath += '.png'
            if (!fileUtils.exists(thumbnailPath)) {
                let sourcePath = fileUtils.getSavePath(key)
                if (sourcePath) {
                    thumbnailPath = yield this.createThumbnail(sourcePath, key, w)
                }
            }
            if (fileUtils.exists(thumbnailPath)) {
                return thumbnailPath
            }
            return null
        }
        /**
         * create thumbnail
         * @param {String} sourcePath 
         * @param {String} key   
         * @param {String} width  
         * @api public
         */
    ImageConvert.prototype.createThumbnail = function(sourcePath, key, width) {
        let self = this
        let height = width
        return function(done) {
            let aimPath = path.join(self.cachePath, key + '-' + width + 'x' + width + '.png')
            if (fileUtils.exists(aimPath)) {
                return done(null, aimPath)
            } else {
                self.im.identify(['-format', '%wx%h', sourcePath], function(err, stdout) {
                    if (!err) {
                        let info = stdout.split('x')
                        let w = parseInt(info[0])
                        let h = parseInt(info[1])
                            //only 
                        if (w <= width && h <= height) {
                            width = w
                            height = h
                        }
                    }
                    //create parent folder
                    let parentPath = path.dirname(aimPath)
                    if (!fileUtils.exists(parentPath)) {
                        mkdirp.sync(parentPath)
                    }
                    self.im.convert([sourcePath, '-resize', width + 'x' + height, aimPath],
                        function(err, stdout) {
                            done(null, aimPath)
                        })
                })

            }

        }
    }
    exports.ImageConvert = ImageConvert
