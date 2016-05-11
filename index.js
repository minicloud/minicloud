process.on('uncaughtException', function(err){
  console.log(`Caught exception: ${err}`)
})
require('co').wrap(function*() {
    var app = yield require("./lib/loader/app-loader")()
    app.listen(global.config.port)
})()
