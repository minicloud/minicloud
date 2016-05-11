var HttpUtils = require('../../utils/http-utils').HttpUtils
var httpUtils = new HttpUtils()
var FileUtils = require('../../utils/file-utils').FileUtils
var fileUtils = new FileUtils()
    /**
     * return doc cover file 
     * @api public
     */
exports.cover = function*() {
        var body = this.request.body
        var filePath = null
        var dc = global.config['plugins']['dc']
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
        var body = this.request.body
        var filePath = null
        var dc = global.config['plugins']['dc']
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
    var body = this.request.body
    var localPath = fileUtils.getSavePath(body['key'])
    if (localPath) {
        var dc = global.config['plugins']['dc']
        if (dc) {
            dc['convert'].addTask(localPath, body)
            this.body = ''
        }
    } else {
        this.status = 404
        this.body = 'Not Found'
    }
}
