const HttpUtils = require('../../utils/http-utils').HttpUtils
let httpUtils = new HttpUtils()
const FileUtils = require('../../utils/file-utils').FileUtils
let fileUtils = new FileUtils()
    /**
     * return doc cover file 
     * @api public
     */
exports.cover = function*() {
        let body = this.request.body
        let filePath = null
        let dc = global.config['plugins']['dc']
        if (dc) {
            filePath = dc['convert'].getCoverPath(body['key'])
        }
        yield httpUtils.sendFile(this, filePath, 'image.png', '0')
    }
    /**
     * return pdf file
     * @api public
     */
exports.pdf = function*() {
        let body = this.request.body
        let filePath = null
        let dc = global.config['plugins']['dc']
        if (dc) {
            filePath = dc['convert'].getPdfPath(body['key'])
        }
        yield httpUtils.sendFile(this, filePath, 'image.pdf', '0')
    }
    /**
     * convert doc
     * @api public
     */
exports.convert = function*() {
    let body = this.request.body
    let localPath = fileUtils.getSavePath(body['key'])
    if (localPath) {
        let dc = global.config['plugins']['dc']
        if (dc) {
            dc['convert'].addTask(localPath, body)
            this.body = ''
        }
    } else {
        this.status = 404
        this.body = 'Not Found'
    }
}
