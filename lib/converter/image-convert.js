    var path = require('path')
    var S = require('string')
    var fs = require('fs')
    var mkdirp = require('mkdirp')
    var FileUtils = require('../utils/file-utils').FileUtils
    var fileUtils = new FileUtils()
        /**
         * image create thumbnail
         * @param {String} convertPath 
         * @param {String} identifyPath
         * @param {String} cachePath    
         * @api public
         */
    var ImageConvert = function(convertPath, identifyPath, cachePath) {
            var im = require('imagemagick')
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
            if (!(w === "32" || w === "640")) {
                w = 640
            }
            var thumbnailPath = path.join(this.cachePath, key + '-' + w + 'x' + w)
            if (key.toLowerCase().indexOf('.gif')) {
                thumbnailPath += '-0'
            }
            thumbnailPath += '.png'
            if (!fs.existsSync(thumbnailPath)) {
                var sourcePath = fileUtils.getSavePath(key)
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
        var self = this
        return function(done) {
            var aimPath = path.join(self.cachePath, key + '-' + width + 'x' + width + '.png')
            if (fs.existsSync(aimPath)) {
                return done(null, aimPath)
            } else {
                //創建父親目錄
                var parentPath = path.dirname(aimPath)
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
