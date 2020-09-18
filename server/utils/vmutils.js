const NodeSSH = require('node-ssh').NodeSSH

async function check_connection(ip, port, password, private_key, user) {
    let ssh = new NodeSSH()
    await ssh.connect({
        host: ip,
        port: port,
        password: password,
        private_key: private_key,
        username: user,
        readyTimeout: 1000
    })
}

async function copy_to_vm(local_dir, ip, port, password, private_key, user, dir) {
    let ssh = new NodeSSH()
    await ssh.connect({
        host: ip,
        port: port,
        password: password,
        private_key: private_key,
        username: user,
        readyTimeout: 2000
    })
    await ssh.putDirectory(local_dir, dir)
    const pid = await ssh.exec('cat', [dir + '/agent/agent.pid'], {})
    if (pid !== undefined && pid !== null && pid !== '') {
        await ssh.execCommand('kill', [pid])
    }
    await ssh.exec('./agent', [], {
        cwd: dir + '/agent'
    })
    await ssh.exec('yarn', ['start'], {
        cwd: dir + '/server_agent'
    })
}

async function restart_agent(ip, port, password, private_key, user, dir) {
    let ssh = new NodeSSH()
    await ssh.connect({
        host: ip,
        port: port,
        password: password,
        private_key: private_key,
        username: user,
        readyTimeout: 2000
    })
    const pid = await ssh.exec('cat', [dir + '/agent/agent.pid'], {})
    if (pid !== undefined && pid !== null && pid !== '') {
        await ssh.execCommand('kill', [pid])
    }
    await ssh.exec('./agent', [], {
        cwd: dir + '/agent'
    })
}

module.exports = { check_connection, copy_to_vm, restart_agent }