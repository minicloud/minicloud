var https = require('https')
var http = require('http')
var fs = require('fs')
var path = require('path')
process.on('uncaughtException', function(err) {
    console.log(`Caught exception: ${err}`)
    console.log(`Caught exception: ${err.stack}`)
        //singleApp
    if (err.errno === 'EADDRINUSE') {
        process.exit(0)
    }
})
try {
    require('co').wrap(function*() {
        var app = yield require("./lib/loader/app-loader")()
        var options = {
            key: fs.readFileSync(path.join(__dirname, 'server.key')),
            cert: fs.readFileSync(path.join(__dirname, 'server.crt'))
        }
        http.createServer(app.callback()).listen(global.config.port + 1)
        https.createServer(options, app.callback()).listen(global.config.port)
    })()
} catch (error) {
    console.log(`Caught exception: ${error}`)
    console.log(`Caught exception: ${error.stack}`)
}
