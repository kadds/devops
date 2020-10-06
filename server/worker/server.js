const { m_server, m_mode, m_vm } = require('../data')
const NodeSSH = require('node-ssh').NodeSSH
const FLAGS = require('../flags')
const { update_vm_servers } = require('./../utils/vmutils')
const Config = require('../config')

async function update_vm_agent(vm_name) {
    const data = await m_server.findAll({ where: { vm_name: vm_name } })
    const vm = await m_vm.findByPk(vm_name)
    let servers = []
    for (const it of data) {
        servers.push(it.name)
    }
    await update_vm_servers(servers, vm.name, vm.ip, vm.port, vm.password, vm.private_key, vm.user, vm.base_dir)
}

async function connect(vm_name) {
    const vm = await m_vm.findByPk(vm_name)
    if (vm === undefined || vm === null) {
        throw new Error('query vm fail name is ' + vm_name)
    }
    let ssh = new NodeSSH()
    await ssh.connect({
        host: vm.ip,
        port: vm.port,
        password: vm.password,
        private_key: vm.private_key,
        username: vm.user,
        readyTimeout: 2000
    })
    return ssh
}

function get_version(image_name) {
    const tmp = image_name.split(':')
    if (tmp.length < 2) {
        throw new Error('invalid image name ' + image_name)
    }
    return parseInt(tmp[tmp.length - 1])
}

function config_get() {
    const config = Config.get()
    const min = config.server.deploy.port.min
    const max = config.server.deploy.port.max
    const prefix = config.server.deploy.image.prefix
    const postfix = config.server.deploy.image.postfix
    const log_port = config.log.port
    return { min, max, log_port, prefix, postfix }
}

async function stop(name) {
    console.log(name + ' stopping')
    const server = await m_server.findByPk(name)
    let is_last_start = false
    if (server.status !== FLAGS.SVR_STATUS_RUNNING) {
        if (server.status === FLAGS.SVR_STATUS_DESTROYING || server.status === FLAGS.SVR_STATUS_DESTROYED || server.status === FLAGS.SVR_STATUS_INIT) {
            throw new Error(`server state is ${server.status} cannot start`)
        }
    }
    else {
        is_last_start = true
    }

    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_STOPPING }, { where: { name } })
    if (num !== 1) {
        throw new Error('server stop fail because of update check fail ' + name)
    }
    let old_version = null
    let ssh = null
    try {
        ssh = await connect(server.vm_name)
        const res = await ssh.execCommand('docker ps --format "{{.Image}}" --filter name=' + name)
        if (res.stdout !== '') {
            old_version = get_version(res.stdout)
        }
        await ssh.execCommand('docker stop ' + name)
    }
    catch (e) {
        if (is_last_start) {
            await m_server.update({ status: FLAGS.SVR_STATUS_RUNNING }, { where: { name: name } })
        }
        else {
            await m_server.update({ status: FLAGS.SVR_STATUS_STOPPED }, { where: { name: name } })
        }
        throw e
    }

    try {
        await ssh.execCommand('docker rm ' + name)
    }
    catch (e) {
        // ignore
        console.error(e)
    }

    await m_server.update({ status: FLAGS.SVR_STATUS_STOPPED }, { where: { name: name } })

    console.log(name + ' stopped')
    return old_version
}

async function start(name, version) {
    console.log(name + ' starting')
    let server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_STOPPED) {
        throw new Error(`server state is ${server.status} cannot start`)
    }

    if (version === null || version === undefined) {
        version = server.content.version
    }
    else {
        server.content.version = version
    }

    if (version === null || version === undefined) {
        throw new Error(`${name} server version is null`)
    }

    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_STARTING, content: server.content }, { where: { name } })
    if (num !== 1) {
        throw new Error('server start fail because of update check fail ' + name)
    }
    let ssh = null
    try {
        ssh = await connect(server.vm_name)
        // pull image
        const config = config_get()

        await ssh.execCommand(`docker pull ${config.prefix}${name}${config.postfix}:${version}`)
    }
    catch (e) {
        // pull docker fail
        await m_server.update({ status: FLAGS.SVR_STATUS_STOPPED }, { where: { name } })
        throw e
    }

    try {
        const vm = await m_vm.findByPk(server.vm_name)

        const ip = vm.ip
        // random port
        await ssh.execCommand(`docker run --network host --env HOST_IP=${ip} -d --name ${name} ${name}:latest sh /root/start.sh`)
    }
    catch (e) {
        await m_server.update({ status: FLAGS.SVR_STATUS_STOPPED }, { where: { name } })
    }

    server = await m_server.findByPk(name)
    let content = server.content
    content.res = content.res || {}
    content.res.last_start_time = (new Date()).valueOf()
    await m_server.update({ status: FLAGS.SVR_STATUS_RUNNING, content }, { where: { name } })
    console.log(name + ' started')
}

async function restart(name, version) {
    console.log(name + ' restarting')
    let old_version = await stop(name)
    await start(name, version)
    console.log(name + ' restarted')
    return old_version
}

async function init(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_INIT) {
        throw new Error(`server state is ${server.status} cannot start`)
    }
    await update_vm_agent(server.vm_name)
    await m_server.update({ status: FLAGS.SVR_STATUS_STOPPED }, { where: { name, status: FLAGS.SVR_STATUS_INIT } })
}

async function destroy(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_STOPPED) {
        // first stop
        const ssh = await connect(server.vm_name)
        await ssh.execCommand('docker stop ' + name)
        await ssh.execCommand('docker rm ' + name)
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_DESTROYING }, { where: { name } })
    if (num !== 1) {
        throw new Error('server destroy fail ' + name)
    }
    await update_vm_agent(server.vm_name)
    await m_server.update({ status: FLAGS.SVR_STATUS_DESTROYED }, { where: { name, status: FLAGS.SVR_STATUS_DESTROYING } })
    await m_server.destroy({ where: { name } })
}

module.exports = { start, stop, init, destroy, restart }
