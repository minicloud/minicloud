/**
 * Module dependencies.
 */
const path = require('path')
const fs = require('fs')
    /**
     * Load resources in `root` directory. * 
     *
     * @param {Object} oauth
     * @param {Object} router
     * @param {String} root
     * @api public
     */
module.exports = function(router, root) {
        fs.readdirSync(root).forEach(function(file) {
            let dir = path.resolve(root, file)
            let stats = fs.lstatSync(dir)
            if (stats.isDirectory()) {
                const conf = require(dir + '/config.json')
                conf.directory = dir
                __route(router, conf)
            }
        })
    }
    /**
     * init api route 
     * @param {Object} router
     * @param {String} apiPath
     * @param {Object} fn
     * @param {Object} conf
     * @api private
     */
let __apiRoute = function(router, apiPath, fn, conf) {
        //init context
        const contextMiddleware = require('../middleware/context-middleware')
        router.use(apiPath, contextMiddleware(conf))
        let methods = ['GET', 'POST']
        if (typeof(conf.method) != 'undefined') {
            methods = conf.method.split(',')
        }
        for (let i = 0; i < methods.length; i++) {
            let method = methods[i].toUpperCase()
            if (method === 'GET') {
                router.get(apiPath, fn)
            } else {
                router.post(apiPath, fn)
            }
        }
    }
    /**
     * Define routes in `conf`.
     * @param {Object} router
     * @param {String} conf
     * @api private
     */
let __route = function(router, conf) {
    const mod = require(conf.directory)
    for (let key in conf.routes) {
        let prop = conf.routes[key]
        let apiPath = key.split(' ')[0]
        let fn = mod[prop]
        if (!fn) throw new Error(conf.name + ': exports.' + prop + ' is not defined')
        __apiRoute(router, apiPath, fn, conf)
    }
}
