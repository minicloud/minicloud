exports.status = function*() {

    var data = {}
    var appConfig = global.config
        //ip
    var ips = appConfig.ips
    for (var i = 0; i < ips.length; i++) {
        var ip = ips[i]
        var msg = ip.ip + ":" + appConfig.port
        data['迷你云可选地址' + (i + 1)] = {
            status: true,
            msg: msg
        }
    }
    //network
    var itemStatus = true
    var msg = "正常"
    if (typeof(appConfig.socket) === 'undefined') {
        msg = "错误 *无法连接到http://miniyun.cn"
        itemStatus = false
    }
    data['网络状态'] = {
            status: itemStatus,
            msg: msg
        }
        //actived
    if (typeof(appConfig.access_token) !== 'undefined' && appConfig.access_token.secret) {
        data['激活状态'] = {
            status: true,
            msg: "已激活"
        }
    } else {
        data['激活状态'] = {
            status: false,
            msg: "错误 *访问http://miniyun.cn注册并激活"
        }
    }
    //disk
    var disks = appConfig.disk
    for (var i = 0; i < disks.length; i++) {
        var disk = disks[i]
        data['本地存储路径' + (i + 1)] = {
            status: true,
            msg: disk.path + ' *文件将存储在此'
        }
    }
    //folder
    if (typeof(appConfig.folder) === 'undefined') {
        data['老文件夹'] = {
            status: true,
            msg: "尚未配置 *访问http://miniyun.cn激活后，可一键快速导入老文件夹"
        }
    } else {
        for (var i = 0; i < appConfig.folder.length; i++) {
            var folder = appConfig.folder[i] 
            var folderStatus = folder.status
            if (typeof(folderStatus) === 'undefined') {
                folderStatus = "还未同步"
            } else if (folderStatus === 1) {
                folderStatus = "同步中"
            } else if (folderStatus === 2) {
                folderStatus = "同步完成"
            }
            data['老文件夹' + (i + 1)] = {
                status: true,
                msg: folder.path + ' *' + folderStatus
            }
        }
    }
    //插件
    var vc = global.config.plugins.vc
    if (vc) {
        data['视频转换插件'] = { status: true, msg: "已经启用" }
    } else {
        data['视频转换插件'] = { status: true, msg: "尚未启用，该插件可支持任意格式视频转码，请访问http://wenda.miniyun.cn/?/question/547 获得帮助" }
    }
    var dc = global.config.plugins.dc
    if (dc) {
        data['文档浏览插件'] = { status: true, msg: "已经启用" }
    } else {
        data['文档浏览插件'] = { status: true, msg: "尚未启用，该插件支持doc/docx/ppt/pptx/xls/xlsx/pdf在线浏览，请访问http://wenda.miniyun.cn/?/question/548 获得帮助" }
    }
    //日志文件
    data['日志文件位置'] = { status: true, msg:  appConfig.logPath}
    return data
}
