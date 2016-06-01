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
            if (!isNaN(w)) {
                w = 640
            }
            let thumbnailPath = path.join(this.cachePath, key + '-' + w + 'x' + w)
            if (key.toLowerCase().indexOf('.gif')) {
                thumbnailPath += '-0'
            }
            thumbnailPath += '.png'
            if (!fs.existsSync(thumbnailPath)) {
                let sourcePath = fileUtils.getSavePath(key)
                if (sourcePath) {
                    thumbnailPath = yield this.createThumbnail(sourcePath, key, w)
                }
            }
            if (fs.existsSync(thumbnailPath)) {
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
        return function(done) {
            let aimPath = path.join(self.cachePath, key + '-' + width + 'x' + width + '.png')
            if (fs.existsSync(aimPath)) {
                return done(null, aimPath)
            } else {
                //create parent folder
                let parentPath = path.dirname(aimPath)
                if (!fs.existsSync(parentPath)) {
                    mkdirp.sync(parentPath)
                }
                self.im.convert([sourcePath, '-resize', width + 'x' + width, aimPath],
                    function(err, stdout) {
                        done(null, aimPath)
                    })
            }

        }
    }
    exports.ImageConvert = ImageConvert
