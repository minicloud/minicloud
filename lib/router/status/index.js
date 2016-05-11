    //显示状态
    exports.hello = function*() {
        var method = this.req.method
        if (method === 'GET') {
            this.body = 'minicloud v' + global.config.version + ' is running....'
        } else {
            var appStatus = require('../../model/status')
            var status = yield appStatus.status()
            var bodyTxt = ""
            var error = 0
            for (var key in status) {
                var value = status[key]
                if (value.status === false) {
                    error++
                }
                bodyTxt += key + " " + value.msg + "\r\n\r\n"
            }
            if (error === 0) {
                this.status = 200
            } else {
                this.status = 409
            }
            this.body = bodyTxt
        }
    }
