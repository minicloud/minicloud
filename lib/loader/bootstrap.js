var path = require('path')
var fs = require('fs')
var mkdirp = require('mkdirp')
var os = require('os')
var co = require('co')
var log4js = require('log4js')
log4js.loadAppender('file')
const exec = require('child_process').exec
var rootPath = path.join(__dirname, '..', '..')
var logFolderPath = path.join(rootPath, 'logs')
    /**
     * app config     
     * @api private
     */
var appConfig = function() {
    var configPath = path.join(rootPath, 'config.json')
    var config = {}
    if (fs.existsSync(configPath)) {
        config = require(configPath)
    }
    if (!config.disk) {
        //default disk
        config.disk = [{
            path: path.join(rootPath, 'data'),
            size: 0
        }]
    }
    if (!config.minicloud_host) {
        //default disk
        config.minicloud_host = 'https://miniyun.cn/socket'
    }
    if (!config.port) {
        //default port
        config.port = 6090
    }
    if (!config.http) {
        //default http
        config.http = false
    }
    //default version
    config.version = '3.0'
        //default logger save path
    if (!fs.existsSync(logFolderPath)) {
        mkdirp.sync(logFolderPath)
    }
    config.logPath = path.join(logFolderPath, 'minicloud.log')
        //create folder path
    for (var i = 0; i < config.disk.length; i++) {
        var disk = config.disk[i]
        var savePath = disk.path
        if (!fs.existsSync(savePath)) {
            mkdirp.sync(savePath)
        }
        //create temp folder path
        var tempPath = path.join(savePath, 'temp')
        if (!fs.existsSync(tempPath)) {
            mkdirp.sync(tempPath)
        }
        disk.temp_path = tempPath
    }
    //create cache folder
    if (!config.cache_path) {
        config.cache_path = path.join(rootPath, 'convert_data')
    }
    if (!fs.existsSync(config.cache_path)) {
        mkdirp.sync(config.cache_path)
    }
    //create app temp folder
    if (!config.temp_path) {
        config.temp_path = path.join(rootPath, 'temp')
    }
    if (!fs.existsSync(config.temp_path)) {
        mkdirp.sync(config.temp_path)
    }
    return config
}()
var logger = null
    /**
     * config logger     
     * @api private
     */
var __logger = function() {
        log4js.configure({
            appenders: [
                { type: 'console' }, {
                    absolute: true,
                    type: 'file',
                    filename: path.join(logFolderPath, 'minicloud.log'),
                    category: 'minicloud',
                    maxLogSize: 52428800,
                    backups: 30
                }
            ]
        })
        logger = log4js.getLogger('minicloud')
        logger.setLevel('TRACE')
        appConfig.logger = logger
    }()
    /**
     * return ips     
     * @api private
     */
var __ip = function() {
        var ifaces = os.networkInterfaces()
        var ips = []
        Object.keys(ifaces).forEach(function(ifname) {
            var alias = 0

            ifaces[ifname].forEach(function(iface) {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return
                }
                if (alias >= 1) {
                    // this single interface has multiple ipv4 addresses
                    logger.info(ifname + ':' + alias, iface.address)
                    ips.push({
                        name: ifname,
                        ip: iface.address
                    })
                } else {
                    // this interface has only one ipv4 adress
                    logger.info(ifname, iface.address)
                    ips.push({
                        name: ifname,
                        ip: iface.address
                    })
                }
                ++alias
            })
        })
        appConfig.ips = ips
    }()
    /**
     * start iptables     
     * @api private
     */
var __iptables = function() {
        var osName = os.platform()
        if (osName === 'win32') {
            const exec = require('child_process').exec
            var cmd1 = 'netsh firewall set portopening TCP ' + appConfig.port + ' miniStoreservice' + appConfig.port + ' enable'
            exec(cmd1, function(error, stdout, stderr) {
                if (error !== null) {
                    logger.error('firewall open port:' + appConfig.port)
                } else {
                    logger.info('firewall open port:' + appConfig.port)
                }
            })
        } else {
            logger.warn('Please manually open the firewall ' + appConfig.port + ' port')
        }
    }()
    /**
     * connect minicloud     
     * @api private
     */
var __connectMinicloud = function(appConfig) {
    var socket = require('socket.io-client')(appConfig.minicloud_host)
    socket.on('connect_error', function(error) {
            logger.error(error)
        })
        // socket service list 
    var socketServiceList = []
    var socketRootPath = path.join(__dirname, '..', 'socket')
    fs.readdirSync(socketRootPath).forEach(function(file) {
        var filePath = path.resolve(socketRootPath, file)
        var socketService = require(filePath)
        socketServiceList.push(socketService)
    })
    socket.on('connect', function() {
        appConfig.socket = socket
        for (var i = 0; i < socketServiceList.length; i++) {
            var item = socketServiceList[i]
            item.init(socket)
        }
        //auto sync old folders
        var SocketSyncFolder = require('../sync-folder/sync-folder').SocketSyncFolder
        var syncFolder = new SocketSyncFolder()
        syncFolder.start()
    })
}
exports.config = appConfig
exports.connectMinicloud = __connectMinicloud
