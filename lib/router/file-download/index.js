var FileUtils = require('../../utils/file-utils').FileUtils
var fileUtils = new FileUtils()
var HttpUtils = require('../../utils/http-utils').HttpUtils
var httpUtils = new HttpUtils()
    /**
     * download file 
     * @api public
     */
exports.download = function*() {
    var body = this.request.body
    var filePath = fileUtils.getSavePath(body['key'])
    if (filePath) {
        yield httpUtils.sendFile(this, filePath, body['file_name'], body['force_download'])
    } else {
        this.status = 404
        this.body = 'Not Found'
    }
}
