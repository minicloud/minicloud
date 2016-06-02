const path = require('path')
const fs = require('fs')
const mkdirp = require('mkdirp')
const os = require('os')
const co = require('co')
const log4js = require('log4js')
log4js.loadAppender('file')
const exec = require('child_process').exec
let rootPath = path.join(__dirname, '..', '..')
let logFolderPath = path.join(rootPath, 'logs')
    /**
     * return defaultDisk     
     * @api private
     */
let __getDefaultDisk = function() {
        let osName = os.platform()
            //default disk
        return function(done) {
            let diskPath = path.join(rootPath, 'data')
            if (osName === 'win32') {
                const drivelist = require('drivelist')
                drivelist.list(function(error, disks) {
                    if (!error) {
                        for (let i = 0; i < disks.length; i++) {
                            let item = disks[i]
                            if (!item.system) {
                                //windows 
                                diskPath = item.name + '\\迷你云'
                            }
                        }
                    }
                    return done(null, diskPath)
                })
            } else {
                //linux 
                return done(null, diskPath)
            }
        }
    }
    /**
     * app config     
     * @api private
     */
let __getAppConfig = function*() {
        let configPath = path.join(rootPath, 'config.json')
        let config = {}
        if (fs.existsSync(configPath)) {
            config = require(configPath)
        }
        if (!config.disk) {
            //default disk
            let defaultDiskPath = yield __getDefaultDisk()
            config.disk = [{
                path: defaultDiskPath,
                size: 0
            }]
        }
        let firstDiskPath = config.disk[0].path
            //minicloud valid status,default invalid
        config.minicloud_valid = false
        if (!config.minicloud_host) {
            //default disk
            config.minicloud_host = 'https://app.miniyun.cn'
        }
        if (!config.port) {
            //default port
            config.port = 6090
        }
        if (!config.http) {
            //default http
            config.http = false
        }
        //net status
        config.net_status = 0
            //default version
        config.version = '3.0.0'
            //default logger save path
        if (!fs.existsSync(logFolderPath)) {
            mkdirp.sync(logFolderPath)
        }
        config.logPath = path.join(logFolderPath, 'minicloud.log')
            //create folder path
        for (let i = 0; i < config.disk.length; i++) {
            let disk = config.disk[i]
            let savePath = disk.path
            if (!fs.existsSync(savePath)) {
                mkdirp.sync(savePath)
            }
            //create temp folder path
            let tempPath = path.join(savePath, 'temp')
            if (!fs.existsSync(tempPath)) {
                mkdirp.sync(tempPath)
            }
            disk.temp_path = tempPath
        }
        //create cache folder
        if (!config.convert_data_path) {
            config.convert_data_path = path.join(firstDiskPath, 'convert_data')
        }
        if (!fs.existsSync(config.convert_data_path)) {
            mkdirp.sync(config.convert_data_path)
        }
        //create app temp folder
        if (!config.temp_path) {
            config.temp_path = path.join(firstDiskPath, 'temp')
        }
        //create app histroy folder
        if (!config.histroy_path) {
            config.histroy_path = path.join(firstDiskPath, 'histroy')
        }
        if (!fs.existsSync(config.temp_path)) {
            mkdirp.sync(config.temp_path)
        }
        return config
    }
    /**
     * config logger     
     * @api private
     */
let __setLogger = function(appConfig) {
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
        let logger = log4js.getLogger('minicloud')
        logger.setLevel('TRACE')
        appConfig.logger = logger
    }
    /**
     * return ips     
     * @api private
     */
let __setIp = function(appConfig) {
        let ifaces = os.networkInterfaces()
        let ips = []
        Object.keys(ifaces).forEach(function(ifname) {
            let alias = 0
            ifaces[ifname].forEach(function(iface) {
                if ('IPv4' !== iface.family || iface.internal !== false) {
                    // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                    return
                }
                if (alias >= 1) {
                    // this single interface has multiple ipv4 addresses
                    appConfig.logger.info(ifname + ':' + alias, iface.address)
                    ips.push({
                        name: ifname,
                        ip: iface.address
                    })
                } else {
                    // this interface has only one ipv4 adress
                    appConfig.logger.info(ifname, iface.address)
                    ips.push({
                        name: ifname,
                        ip: iface.address
                    })
                }
                ++alias
            })
        })
    }
    /**
     * start iptables     
     * @api private
     */
let __setIptables = function(appConfig) {
        let osName = os.platform()
        if (osName === 'win32') {
            const exec = require('child_process').exec
            let cmd1 = 'netsh firewall set portopening TCP ' + appConfig.port + ' miniStoreservice' + appConfig.port + ' enable'
            exec(cmd1, function(error, stdout, stderr) {
                if (error !== null) {
                    appConfig.logger.error('firewall open port:' + appConfig.port)
                } else {
                    appConfig.logger.info('firewall open port:' + appConfig.port)
                }
            })
        } else {
            appConfig.logger.warn('Please manually open the firewall ' + appConfig.port + ' port')
        }
    }
    /**
     * connect minicloud     
     * @api private
     */
let __connectMinicloud = function(appConfig) {
    let socket = require('socket.io-client')(appConfig.minicloud_host)
    socket.on('connect_error', function(error) {
            //net status
            appConfig.net_status = -1
            appConfig.logger.error(error)
        })
        // socket service list 
    let socketServiceList = []
    let socketRootPath = path.join(__dirname, '..', 'socket')
    fs.readdirSync(socketRootPath).forEach(function(file) {
        let filePath = path.resolve(socketRootPath, file)
        try {
            var socketService = require(filePath)
        } catch (error) {
            console.log(error)
        } 
        socketServiceList.push(socketService)
    })
    socket.on('connect', function() {
        //net status
        appConfig.net_status = 1
        appConfig.socket = socket
        for (let i = 0; i < socketServiceList.length; i++) {
            let item = socketServiceList[i]
            item.init(socket)
        }
        //auto sync old folders
        let SocketSyncFolder = require('../sync-folder/sync-folder').SocketSyncFolder
        let syncFolder = new SocketSyncFolder()
        syncFolder.start()
    })
}
exports.getConfig = function*() {
    let config = yield __getAppConfig()
    __setLogger(config)
    __setIp(config)
    __setIptables(config)
    return config
}
exports.connectMinicloud = __connectMinicloud
