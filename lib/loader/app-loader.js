/**
 * Module dependencies.
 */
const koa = require('koa')
const path = require('path')
const cors = require('kcors')
const router = require('koa-router')()
const bodyParser = require('koa-bodyparser')
const ssl = require('koa-ssl')
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
    const bootstrap = require('./bootstrap')
    let config = yield bootstrap.getConfig()
    global.config = config
    const plugin = require('../model/plugin')
        //init plugin
    yield plugin.init()
        //connect plugin
    bootstrap.connectMinicloud(config)
        //start koa
    let app = koa()
        //  SSL on all page
    app.use(ssl())
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
    let apiLoader = require('./router-loader')
    apiLoader(router, path.join(__dirname, '..', 'router'))

    return app
}
