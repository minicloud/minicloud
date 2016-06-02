const FileUtils = require('../../utils/file-utils').FileUtils
let fileUtils = new FileUtils()
const HttpUtils = require('../../utils/http-utils').HttpUtils
let httpUtils = new HttpUtils()
    /**
     * download file 
     * @api public
     */
exports.download = function*() {
    let body = this.request.body
    let filePath = fileUtils.getSavePath(body['key'])
    if (filePath) {
        yield httpUtils.sendFile(this, filePath, body['file_name'], body['force_download'])
    } else {
        this.status = 404
        this.body = 'Not Found'
    }
}
