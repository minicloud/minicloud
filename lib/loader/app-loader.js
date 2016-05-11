/**
 * Module dependencies.
 */
var koa = require('koa')
var path = require('path')
var cors = require('kcors')
var router = require('koa-router')()
var bodyParser = require('koa-bodyparser')
    /**
     * Return koa app.
     *
     * load all middleware and all routers
     * @param {Object} opts
     * @return {Object}
     * @api public
     */

module.exports = function*() {
    //config
    var bootstrap = require('./bootstrap')
    var config = bootstrap.config
    global.config = config
    var plugin = require('../model/plugin')
        //init plugin
    yield plugin.init()
        //connect plugin
    bootstrap.connectMinicloud(config) 
        //start koa
    var app = koa()
    app.use(bodyParser())
        //support cros    
    app.use(cors({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, PATCH, DELETE',
        'Access-Control-Allow-Headers': 'X-Requested-With,content-type',
        'Access-Control-Allow-Credentials': true
    }))
    router.use(require('koa-validate')())
        // routing 
    app.use(router.routes())
        .use(router.allowedMethods())
    app.on('error', function(err) {
            global.config.logger.error('server error', err)
            global.config.logger.error(err.stack)
        })
        //load router
    var apiLoader = require('./router-loader')
    apiLoader(router, path.join(__dirname, '..', 'router'))
    return app
}
