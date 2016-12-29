const FileUtils = require('../../utils/file-utils').FileUtils
let fileUtils = new FileUtils()
const HttpUtils = require('../../utils/http-utils').HttpUtils
let httpUtils = new HttpUtils()
const fs = require('fs')
const FileMime = require('../../utils/file-mime')
    /**
     * return thumbnail file 
     * @api public
     */
exports.thumbnail = function*() {
    let body = this.request.body
    let key = body.key
    let mimetype = FileMime.lookup(key) || '' 
    let filePath = null
    if (mimetype.indexOf('image') >= 0) {
        //image thumbnail
        let ic = global.config['plugins']['ic']
        if (ic) {
            filePath = yield ic['convert'].getThumbnailPath(body['key'], body['w'], body['h'])
        }
        if (!filePath) {
            filePath = fileUtils.getSavePath(body['key'])
        }
    } else if (mimetype.indexOf('video') >= 0) {
        //video thumbnail 
        let vc = global.config['plugins']['vc']
        if (vc) {
            filePath = yield vc['convert'].getCoverPath(body['key'])
        }
    }
    if (filePath) {
        let stat = fs.statSync(filePath)
        if (stat.isFile()) {
            yield httpUtils.sendFile(this, filePath, 'image.png', '0')
            return
        }
    }
    this.status = 404
    this.body = 'Not Found'

}
