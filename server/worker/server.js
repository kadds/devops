const { m_server, m_mode, m_vm } = require('../data')
const NodeSSH = require('node-ssh').NodeSSH
const FLAGS = require('../flags')

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
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_STOPPED) {
        throw `server state is ${server.status} cannot start `
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_STARTING }, { where: { name, status: FLAGS.SVR_STATUS_STOPPED } })
    if (num !== 1) {
        throw 'server start fail because of update check fail'
    }
    const mode = await m_mode.findByPk(server.mode_name)
    const vm = await m_vm.findByPk(server.vm_name)
    const ssh = await connect(server.vm_name)
    await ssh.execCommand('docker stop ' + name)
    await ssh.execCommand('docker rm ' + name)
    await ssh.execCommand('docker pull ' + name + ':latest')
    const ip = vm.ip
    await ssh.execCommand(`docker run -p ${mode.content.port}:${mode.content.port} --env HOST_IP=${ip} --env HOST_PORT=${port} -d --name ${name} ${name}:latest sh /root/start.sh`)
    await m_server.update({ status: FLAGS.SVR_STATUS_RUNNING }, { where: { name, status: FLAGS.SVR_FLAGS_STARTING } })
}

async function stop(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_RUNNING) {
        throw `server state is ${server.status} cannot stop `
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_STOPPING }, { where: { name, status: FLAGS.SVR_STATUS_RUNNING } })
    if (num !== 1) {
        throw 'server stop fail because of update check fail'
    }
    const ssh = await connect(server.vm_name)
    await ssh.execCommand('docker stop ' + name)
    await ssh.execCommand('docker rm ' + name)
}

async function restart(name) {
    const server = await m_server.findByPk(name)
    if (server.status === FLAGS.SVR_STATUS_DESTROYING || server.status === FLAGS.SVR_STATUS_DESTROYED || server.status === FLAGS.SVR_STATUS_INIT) {
        throw `server state is ${server.status} cannot start `
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_RESTARTING }, { where: { name, $or: [{ status: FLAGS.SVR_STATUS_RUNNING }, { status: FLAGS.SVR_STATUS_STOPPED }] } })
    if (num !== 1) {
        throw 'server restart fail because of update check fail'
    }
    const ssh = await connect(server.vm_name)
}

async function init(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_INIT) {
        throw `server state is ${server.status} cannot start `
    }
    // try connect
    await connect(server.vm_name)
    await m_server.update({ status: FLAGS.SVR_STATUS_STOPPED }, { where: { name, status: FLAGS.SVR_STATUS_INIT } })
}

async function destroy(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_STOPPED) {
        console.log('server state is ' + server.status + ' cannot init')
        return
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_DESTROYING }, { where: { name, status: FLAGS.SVR_STATUS_STOPPED } })
    if (num !== 1) {
        console.log('server start fail')
    }

}

module.exports = { start, stop, init, destroy, restart }
