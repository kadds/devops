const { m_server, m_mode, m_vm } = require('../data')
const NodeSSH = require('node-ssh').NodeSSH
const FLAGS = require('../flags')
const { update_vm_servers } = require('./../utils/vmutils')

async function update_vm_agent(vm_name) {
    const data = await m_server.findAll({ where: { vm_name: vm_name } })
    const vm = await m_vm.findByPk(vm_name)
    let servers = []
    for (const it of data) {
        servers.push(it.name)
    }
    console.log(servers)
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

async function start(name) {
    let server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_STOPPED) {
        throw `server state is ${server.status} cannot start `
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_STARTING }, { where: { name, status: FLAGS.SVR_STATUS_STOPPED } })
    if (num !== 1) {
        throw 'server start fail because of update check fail ' + name
    }
    const mode = await m_mode.findByPk(server.mode_name)
    const vm = await m_vm.findByPk(server.vm_name)
    const ssh = await connect(server.vm_name)
    await ssh.execCommand('docker pull ' + name + ':latest')
    const ip = vm.ip
    const port = mode.content.res.port
    await ssh.execCommand(`docker run -p ${port}:${port} --env HOST_IP=${ip} --env HOST_PORT=${port} -d --name ${name} ${name}:latest sh /root/start.sh`)
    server = await m_server.findByPk(name)
    let content = server.content
    content.res = content.res || {}
    content.res.last_start_time = (new Date()).valueOf()
    await m_server.update({ status: FLAGS.SVR_STATUS_RUNNING, content }, { where: { name, status: FLAGS.SVR_STATUS_STARTING } })
}

async function stop(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_RUNNING) {
        throw `server state is ${server.status} cannot stop `
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_STOPPING }, { where: { name, status: FLAGS.SVR_STATUS_RUNNING } })
    if (num !== 1) {
        throw 'server stop fail because of update check fail ' + name
    }
    const ssh = await connect(server.vm_name)
    await ssh.execCommand('docker stop ' + name)
    await ssh.execCommand('docker rm ' + name)
    await m_server.update({ status: FLAGS.SVR_STATUS_STOPPED }, { where: { name: name, status: FLAGS.SVR_STATUS_STOPPING } })
}

async function restart(name) {
    let server = await m_server.findByPk(name)
    if (server.status === FLAGS.SVR_STATUS_DESTROYING || server.status === FLAGS.SVR_STATUS_DESTROYED || server.status === FLAGS.SVR_STATUS_INIT) {
        throw `server state is ${server.status} cannot start `
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_RESTARTING }, { where: { name, status: FLAGS.SVR_STATUS_RUNNING } })
    if (num !== 1) {
        throw 'server restart fail because of update check fail ' + name
    }
    const mode = await m_mode.findByPk(server.mode_name)
    const vm = await m_vm.findByPk(server.vm_name)
    const ssh = await connect(server.vm_name)
    await ssh.execCommand('docker pull ' + name + ':latest')
    const ip = vm.ip
    const port = mode.content.res.port
    await ssh.execCommand(`docker run -p ${port}:${port} --env HOST_IP=${ip} --env HOST_PORT=${port} -d --name ${name} ${name}:latest sh /root/start.sh`)
    server = await m_server.findByPk(name)
    let content = server.content
    content.res = content.res || {}
    content.res.last_start_time = (new Date()).valueOf()
    await m_server.update({ status: FLAGS.SVR_STATUS_RUNNING, content }, { where: { name, status: FLAGS.SVR_STATUS_RESTARTING } })
}

async function init(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_INIT) {
        throw `server state is ${server.status} cannot start `
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
        throw 'server destroy fail ' + name
    }
    await update_vm_agent(server.vm_name)
    await m_server.update({ status: FLAGS.SVR_STATUS_DESTROYED }, { where: { name, status: FLAGS.SVR_STATUS_DESTROYING } })
    await m_server.destroy({ where: { name } })
}

module.exports = { start, stop, init, destroy, restart }
