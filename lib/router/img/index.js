const FileUtils = require('../../utils/file-utils').FileUtils
let fileUtils = new FileUtils()
const HttpUtils = require('../../utils/http-utils').HttpUtils
let httpUtils = new HttpUtils()
const fs = require('fs')
    /**
     * return thumbnail file 
     * @api public
     */
exports.thumbnail = function*() {
    let body = this.request.body
    let filePath = null
    let ic = global.config['plugins']['ic']
    if (ic) {
        filePath = yield ic['convert'].getThumbnailPath(body['key'], body['w'],body['h'])
    }
    if (!filePath) {
        filePath = fileUtils.getSavePath(body['key'])
    }
    let stat = fs.statSync(filePath)
    if (stat.isFile()) { 
        yield httpUtils.sendFile(this, filePath, 'image.png', '0')
    } else {
        this.status = 404
        this.body = 'Not Found'
    }
}
