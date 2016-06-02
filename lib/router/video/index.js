const HttpUtils = require('../../utils/http-utils').HttpUtils
let httpUtils = new HttpUtils()
const FileUtils = require('../../utils/file-utils').FileUtils
let fileUtils = new FileUtils()
const fs = require('fs')
    /**
     * return video cover file 
     * @api public
     */
exports.cover = function*() {
        let body = this.request.body
        let filePath = null
        let vc = global.config['plugins']['vc']
        if (vc) {
            filePath = yield vc['convert'].getCoverPath(body['key'])
        }
        yield httpUtils.sendFile(this, filePath, 'image.png', '0')
    }
    /**
     * return mp4 file
     * @api public
     */
exports.content = function*() {
        let body = this.request.body
        let filePath = null
        let vc = global.config['plugins']['vc']
        if (vc) {
            filePath = vc['convert'].getContentPath(body['key'])
        }
        if (!fileUtils.exists(filePath)) {
            filePath = fileUtils.getSavePath(body['key'])
        }
        let stat = fs.statSync(filePath),
            total = stat.size
        let range = this.req.headers.range
        if (!range) {
            return httpUtils.throw409(this, 'bad_request', 'bad request')
        }
        let parts = range.replace(/bytes=/, "").split("-"),
            partialstart = parts[0],
            partialend = parts[1],
            start = parseInt(partialstart, 10),
            end = partialend ? parseInt(partialend, 10) : total - 1,
            chunksize = (end - start) + 1
        this.res.writeHead(206, {
            'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4'
        })
        let file = fs.createReadStream(filePath, { start: start, end: end })
        file.pipe(this.res)
    }
    /**
     * convert video
     * @api public
     */
exports.convert = function*() {
    let body = this.request.body
    let localPath = fileUtils.getSavePath(body['key'])
    if (localPath) {
        let vc = global.config['plugins']['vc']
        if (vc) {
            vc['convert'].addTask(localPath, body)
            this.body = ''
        }
    } else {
        this.status = 404
        this.body = 'Not Found'
    }
}
