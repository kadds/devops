const NodeSSH = require('node-ssh').NodeSSH

async function check_connection(ip, port, password, private_key, user) {
    let ssh = new NodeSSH()
    await ssh.connect({
        host: ip,
        port: port,
        password: password,
        private_key: private_key,
        username: user,
        readyTimeout: 1000,
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
    console.log('try to copy agent files')
    if (!await ssh.putDirectory(local_dir, dir + '/agent', {
        recursive: false, concurrency: 1,
        tick: (local, remote, err) => { console.log('local ' + local + ' transfer ' + err) },
    })) {
        console.error('ssh put directory fail')
    }
    try {
        console.log('kill agent')
        const pid = (await ssh.execCommand('cat ' + dir + '/agent/agent.pid')).stdout
        if (pid !== undefined && pid !== null && pid !== '') {
            await ssh.execCommand('kill ' + pid)
        }
    }
    catch (err) {
        console.error(err)
    }
    console.log('try start agent')
    await ssh.execCommand('chmod +x ' + dir + '/agent/agent')
    await ssh.exec('./agent -d ./agent.toml', [], {
        cwd: dir + '/agent'
    })
    console.log('reload agent done')
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
    try {
        const pid = (await ssh.execCommand('cat ' + dir + '/agent/agent.pid')).stdout
        if (pid !== undefined && pid !== null && pid !== '') {
            await ssh.execCommand('kill ' + pid)
        }
    }
    catch (err) {
        console.error(err)
    }
    await ssh.exec('./agent -d ./agent.toml', [], {
        cwd: dir + '/agent'
    })
    console.log('restart agent done')
}

async function clear_vm(ip, port, password, private_key, user, dir) {
    let ssh = new NodeSSH()
    await ssh.connect({
        host: ip,
        port: port,
        password: password,
        private_key: private_key,
        username: user,
        readyTimeout: 2000
    })
    try {
        const pid = (await ssh.execCommand('cat ' + dir + '/agent/agent.pid')).stdout
        if (pid !== undefined && pid !== null && pid !== '') {
            await ssh.execCommand('kill ' + pid)
        }
    }
    catch (err) {
        console.log(err)
    }
    await ssh.execCommand('rm -f ./agent ./agent.toml ./agent_servers.txt ./agent.pid', { cwd: dir + '/agent' })
}

async function connect_shell(ip, port, password, private_key, user) {
    let ssh = new NodeSSH()
    await ssh.connect({
        host: ip,
        port: port,
        password: password,
        private_key: private_key,
        username: user,
        readyTimeout: 2000
    })
    return ssh
}

async function update_vm_servers(servers, vm_name, ip, port, password, private_key, user, dir) {
    let ssh = new NodeSSH()
    await ssh.connect({
        host: ip,
        port: port,
        password: password,
        private_key: private_key,
        username: user,
        readyTimeout: 2000
    })
    let str = vm_name + '\n'
    for (const name of servers) {
        str += name + '\n'
    }
    await ssh.execCommand('cat > ./agent_servers.txt', { stdin: str, cwd: dir + '/agent' })
    console.log('update agent_servers.txt done')
}

module.exports = { check_connection, copy_to_vm, restart_agent, clear_vm, connect_shell, update_vm_servers }