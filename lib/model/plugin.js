const os = require('os')
let osName = os.platform()
const path = require('path')
const fs = require('fs')
const exec = require('child_process').exec
const mkdirp = require('mkdirp')
const FileUtils = require('../utils/file-utils').FileUtils
let fileUtils = new FileUtils()
let rootPath = path.join(__dirname, '..', '..')
let logger = global.config.logger
    /**
     * judge plugin has installed     
     * @api private
     */
let __pluginInstalled = function(name) {
        let cmd = name + ' -version'
        return function(done) {
            let command = exec(cmd, { timeout: 10000 }, function(error, stdout, stderr) {
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
let resetImg = function*() {
        let convertPath = null
        let identifyPath = null
        if (osName === 'win32') {
            convertPath = path.join(rootPath, 'plugins', 'imageMagick', 'convert.exe')
            identifyPath = path.join(rootPath, 'plugins', 'imageMagick', 'identify.exe')
            if (!(fileUtils.exists(convertPath))) {
                convertPath = null
            }
            if (!(fileUtils.exists(identifyPath))) {
                identifyPath = null
            }
        } else{
            let convertInstalled = yield __pluginInstalled('convert')
            let identifyInstalled = yield __pluginInstalled('identify')
            if (convertInstalled && convertInstalled) {
                convertPath = 'convert'
                identifyPath = 'identify'
            }
        }
        if (convertPath) {
            //cache file save path
            let cachePath = path.join(global.config.convert_data_path, 'thumbnail')
            if (!fileUtils.exists(cachePath)) {
                mkdirp.sync(cachePath)
            }
            let ImageConvert = require('../converter/image-convert').ImageConvert
            let ic = new ImageConvert(convertPath, identifyPath, cachePath)
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
let resetDoc = function*() {
        //doc convert plugin
        let docPath = null
        let gsPath = null
        if (osName === 'win32') {
            docPath = path.join(rootPath, 'plugins', 'libreOfficePortable', 'LibreOfficePortable.exe')
            gsPath = path.join(rootPath, 'plugins', 'libreOfficePortable', 'Ghostscript', 'bin', 'gswin32c.exe')
            if (!(fileUtils.exists(docPath) && fileUtils.exists(gsPath))) {
                docPath = null
                gsPath = null
            }
        } else if (osName === 'linux') {
            let libreofficeInstalled = yield __pluginInstalled('libreoffice')
            let gsInstalled = yield __pluginInstalled('gs')
            if (libreofficeInstalled && gsInstalled) {
                docPath = 'libreoffice'
                gsPath = 'gs'
            }
        }
        let status = true
        if (docPath && gsPath) {
            //document convert plugin stared,default true 
            if (typeof(global.config.doc_status) !== 'undefined') {
                status = global.config.doc_status
            }
            if (status) {
                //cache file save path
                let cachePath = path.join(global.config.convert_data_path, 'doc')
                if (!fileUtils.exists(cachePath)) {
                    mkdirp.sync(cachePath)
                }
                let DocConvert = require('../converter/doc-convert').DocConvert
                let dc = new DocConvert(logger, docPath, gsPath, cachePath)
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
let resetVideo = function*() {
        //video convert plugin
        let status = true
        let videoPath = null
        if (osName === 'win32') {
            videoPath = path.join(rootPath, 'plugins', 'ffmpeg', 'bin', 'ffmpeg.exe')
            if (!fileUtils.exists(videoPath)) {
                videoPath = null
            }
        } else if (osName === 'linux') {
            let ffmpegInstalled = yield __pluginInstalled('ffmpeg')
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
                let cachePath = path.join(global.config.convert_data_path, 'video')
                if (!fileUtils.exists(cachePath)) {
                    mkdirp.sync(cachePath)
                }
                let VideoConvert = require('../converter/video-convert').VideoConvert
                let vc = new VideoConvert(logger, videoPath, cachePath)
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
    let ic = yield resetImg()
    if (ic) {
        logger.info('image plugin(ImageMagick) is ok')
    } else {
        logger.warn('image plugin(ImageMagick) not install')
    }
    //doc convert plugin
    let dc = yield resetDoc()
    if (dc) {
        logger.info('doc plugin(Libreoffice/gs) is ok')
    } else {
        logger.warn('doc plugin(Libreoffice/gs) no install or no start')
    }
    //video convert plugin
    let vc = yield resetVideo()
    if (vc) {
        logger.info('video plugin(ffmpeg) is ok')
    } else {
        logger.warn('video plugin(ffmpeg) no install or no start')
    }
    global.config.plugins = {
        'ic': ic,
        'dc': dc,
        'vc': vc
    }
}
exports.resetDoc = resetDoc
exports.resetVideo = resetVideo
