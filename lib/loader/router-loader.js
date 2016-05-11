/**
 * Module dependencies.
 */
var path = require('path')
var fs = require('fs')
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
            var dir = path.resolve(root, file)
            var stats = fs.lstatSync(dir)
            if (stats.isDirectory()) {
                var conf = require(dir + '/config.json')
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
var __apiRoute = function(router, apiPath, fn, conf) {
        //init context
        var contextMiddleware = require('../middleware/context-middleware')
        router.use(apiPath, contextMiddleware(conf))
        var methods = ['GET', 'POST']
        if (typeof(conf.method) != 'undefined') {
            methods = conf.method.split(',')
        }
        for (var i = 0; i < methods.length; i++) {
            var method = methods[i].toUpperCase()
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
var __route = function(router, conf) {
    var mod = require(conf.directory)
    for (var key in conf.routes) {
        var prop = conf.routes[key]
        var apiPath = key.split(' ')[0]
        var fn = mod[prop]
        if (!fn) throw new Error(conf.name + ': exports.' + prop + ' is not defined')
        __apiRoute(router, apiPath, fn, conf)
    }
}
