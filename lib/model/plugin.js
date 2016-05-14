var os = require('os')
var osName = os.platform()
var path = require('path')
var fs = require('fs')
const exec = require('child_process').exec
var mkdirp = require('mkdirp')
var rootPath = path.join(__dirname, '..', '..')
var logger = global.config.logger 
    /**
     * judge plugin has installed     
     * @api private
     */
var __pluginInstalled = function(name) {
        var cmd = name + ' -version'
        return function(done) {
            var command = exec(cmd, { timeout: 10000 }, function(error, stdout, stderr) {
                if (error) {
                    return done(null, false)
                } else {
                    return done(null, true)
                }
            })
        }
    }
    /**
     * configure image plugin     
     * @api private
     */
var resetImg = function*() {
        var convertPath = null
        var identifyPath = null
        if (osName === 'win32') {
            convertPath = path.join(rootPath, 'plugins', 'ImageMagick-6.9.3-7-portable-Q16-x86', 'convert.exe')
            identifyPath = path.join(rootPath, 'plugins', 'ImageMagick-6.9.3-7-portable-Q16-x86', 'identify.exe')
            if (!(fs.existsSync(convertPath))) {
                convertPath = null
            }
            if (!(fs.existsSync(convertPath))) {
                identifyPath = null
            }
        } else if (osName === 'linux') {
            var convertInstalled = yield __pluginInstalled('convert')
            var identifyInstalled = yield __pluginInstalled('identify')
            if (convertInstalled && convertInstalled) {
                convertPath = 'convert'
                identifyPath = 'identify'
            }
        }
        if (convertPath) {
            //cache file save path
            var cachePath = path.join(global.config.cache_path, 'thumbnail')
            if (!fs.existsSync(cachePath)) {
                mkdirp.sync(cachePath)
            }
            var ImageConvert = require('../converter/image-convert').ImageConvert
            var ic = new ImageConvert(convertPath, identifyPath, cachePath)
            return {
                convert: ic,
                types: [
                    'image/png',
                    'image/jpg',
                    'image/jpeg'
                ]
            }
        }
        return null
    }
    /**
     * configure doc plugin     
     * @api private
     */
var resetDoc = function*() {
        //doc convert plugin
        var docPath = null
        var gsPath = null
        if (osName === 'win32') {
            docPath = path.join(rootPath, 'plugins', 'LibreOfficePortable', 'LibreOfficePortable.exe')
            gsPath = path.join(rootPath, 'plugins', 'Ghostscript', 'bin', 'gswin32c.exe')
            if (!(fs.existsSync(docPath) && fs.existsSync(gsPath))) {
                docPath = null
                gsPath = null
            }
        } else if (osName === 'linux') {
            var libreofficeInstalled = yield __pluginInstalled('libreoffice')
            var gsInstalled = yield __pluginInstalled('gs')
            if (libreofficeInstalled && gsInstalled) {
                docPath = 'libreoffice'
                gsPath = 'gs'
            }
        }
        var status = true
        if (docPath && gsPath) {
            //document convert plugin stared,default true 
            if (typeof(global.config.doc_status) !== 'undefined') {
                status = global.config.doc_status
            }
            if (status) {
                //cache file save path
                var cachePath = path.join(global.config.cache_path, 'doc')
                if (!fs.existsSync(cachePath)) {
                    mkdirp.sync(cachePath)
                }
                var DocConvert = require('../converter/doc-convert').DocConvert
                var dc = new DocConvert(logger, docPath, gsPath, cachePath)
                return {
                    convert: dc,
                    types: [
                        'application/msword',
                        'application/vnd.ms-excel',
                        'application/vnd.ms-powerpoint',
                        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                        'application/pdf'
                    ]
                }
            }
        }
        return null
    }
    /**
     * configure video plugin     
     * @api private
     */
var resetVideo = function*() {
        //video convert plugin
        var status = true 
        var videoPath = null
        if (osName === 'win32') {
            videoPath = path.join(rootPath, 'plugins', 'ffmpeg-20160512-git-cd244fa-win32-static', 'bin', 'ffmpeg.exe')
            if (!fs.existsSync(videoPath)) {
                videoPath = null
            }
        } else if (osName === 'linux') {
            var ffmpegInstalled = yield __pluginInstalled('ffmpeg')
            if (ffmpegInstalled) {
                videoPath = 'ffmpeg'
            }
        }
        if (videoPath) {
            //video convert plugin stared,default true 
            if (typeof(global.config.video_status) !== 'undefined') {
                status = global.config.video_status
            }
            if (status) {
                //cache file save path
                var cachePath = path.join(global.config.cache_path, 'video')
                if (!fs.existsSync(cachePath)) {
                    mkdirp.sync(cachePath)
                }
                var VideoConvert = require('../converter/video-convert').VideoConvert
                var vc = new VideoConvert(logger, videoPath, cachePath)
                return {
                    convert: vc,
                    types: [
                        'video/',
                        'application/vnd.rn-realmedia-vbr'
                    ]
                }
            }
        }
        return null
    }
    /**
     * configure plugins     
     * @api private
     */
exports.init = function*() {
    //image convert plugin
    var ic = yield resetImg()
    if (ic) { 
        logger.info('image plugin(ImageMagick) is ok')
    } else {
        logger.warn('image plugin(ImageMagick) not install')
    }
    //doc convert plugin
    var dc = yield resetDoc()
    if (dc) {
        logger.info('doc plugin(Libreoffice/gs) is ok')
    } else {
        logger.warn('doc plugin(Libreoffice/gs) no install or no start')
    }
    //video convert plugin
    var vc = yield resetVideo()
    if (vc) {
        logger.info('video plugin(ffmpeg) is ok')
    } else {
        logger.warn('video plugin(ffmpeg) no install or no start')
    }
    global.config.plugins =  {
        'ic': ic,
        'dc': dc,
        'vc': vc
    }
}
exports.resetDoc = resetDoc
exports.resetVideo = resetVideo