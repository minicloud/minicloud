var FileUtils = require('../../utils/file-utils').FileUtils
var fileUtils = new FileUtils()
var HttpUtils = require('../../utils/http-utils').HttpUtils
var httpUtils = new HttpUtils()
    /**
     * return thumbnail file 
     * @api public
     */
exports.thumbnail = function*() {
    var body = this.request.body
    var filePath = null
    var ic = global.config['plugins']['ic']
    if (ic) {
        filePath = yield ic['convert'].getThumbnailPath(body['key'], body['w'])
    }
    if (!filePath) {
        filePath = fileUtils.getSavePath(body['key'])
    }
    yield httpUtils.sendFile(this, filePath, 'image.png', '0')
}
