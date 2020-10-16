const { get } = require('../config')

const NodeSSH = require('node-ssh').NodeSSH

async function connect_shell(vm) {
    let ssh = new NodeSSH()
    await ssh.connect({
        host: vm.ip,
        port: vm.port,
        password: vm.password,
        private_key: vm.private_key,
        username: vm.user,
        readyTimeout: 2000
    })
    ssh.base_dir = '/'
    return ssh
}

async function copy_to_vm(local_dir, vm) {
    let ssh = await connect_shell(vm)
    try {
        console.log('kill agent')
        const pid = (await ssh.execCommand('cat ./agent.pid', { cwd: vm.base_dir + '/agent' })).stdout
        if (pid !== undefined && pid !== null && pid !== '') {
            await ssh.execCommand('kill ' + pid)
        }
    }
    catch (err) {
        console.error(err)
        throw new Error('ssh kill fail')
    }
    console.log('try to copy agent files')
    // if need upload agent.toml
    let res = await ssh.execCommand('cat ./agent.toml', { cwd: vm.base_dir + '/agent' })

    if (!await ssh.putDirectory(local_dir, vm.base_dir + '/agent', {
        recursive: false, concurrency: 1,
        validate: file => {
            if (file.endsWith('agent.toml')) {
                if (res.code !== null && res.code !== 0) {
                    return true
                }
                return false
            }
            return true
        },
        tick: (local, remote, err) => {
            console.log('local ' + local + ' transfer to ' + remote)
            if (err) { console.error(err) }
        },
    })) {
        console.error('ssh put directory fail')
        throw new Error('ssh put directory fail')
    }
    console.log('try start agent')
    await ssh.execCommand('chmod +x ' + vm.base_dir + '/agent/agent')
    await ssh.exec('./agent -d ./agent.toml', [], {
        cwd: vm.base_dir + '/agent'
    })
    console.log('reload agent done')
}

async function restart_agent(vm) {
    let ssh = await connect_shell(vvm)
    try {
        const pid = (await ssh.execCommand('cat ./agent.pid', { cwd: vm.base_dir + '/agent' })).stdout
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

async function clear_vm(vm) {
    let ssh = await connect_shell(vm)
    try {
        const pid = (await ssh.execCommand('cat ./agent.pid', { cwd: vm.base_dir + '/agent' })).stdout
        if (pid !== undefined && pid !== null && pid !== '') {
            await ssh.execCommand('kill ' + pid)
        }
    }
    catch (err) {
        console.log(err)
    }
    await ssh.execCommand('rm -f ./agent ./agent.toml ./agent_servers.txt ./agent.pid', { cwd: vm.base_dir + '/agent' })
}

async function get_vm_config(vm) {
    let ssh = await connect_shell(vm)
    let res = await ssh.execCommand('cat ./agent.toml', { cwd: vm.base_dir + '/agent' })
    return res.stdout
}

async function update_vm_config(vm, config) {
    let ssh = await connect_shell(vm)
    if (config) {
        await ssh.execCommand('cat > ./agent.toml', { stdin: config, cwd: vm.base_dir + '/agent' })
    }
    else {
        await ssh.execCommand('rm -f ./agent.toml', { cwd: vm.base_dir + '/agent' })
    }
}

async function update_vm_servers(servers, vm_name, vm) {
    let ssh = await connect_shell(vm)
    let str = vm_name + '\n'
    for (const name of servers) {
        str += name + '\n'
    }
    await ssh.execCommand('cat > ./agent_servers.txt', { stdin: str, cwd: vm.base_dir + '/agent' })
    console.log('update agent_servers.txt done')
}

function do_result(res, logger) {
    console.log(res)
    if (res.code) {
        let data = 'code ' + res.code + '\n'
        if (res.stdout) {
            data += res.stdout
            if (data[data.length - 1] !== '\n' && logger) {
                data += '\n'
            }
        }
        if (res.stderr) {
            data += res.stderr
        }
        if (data[data.length - 1] === '\n') {
            data.length = data.length - 1
        }
        throw new Error(data)
    }
    else {
        if (res.stdout[res.stdout.length - 1] === '\n') {
            if (logger) {
                logger.write(res.stdout)
            }
            else {
                console.log(res.stdout)
            }
        }
        else {
            if (logger) {
                logger.write(res.stdout + '\n')
            }
            else {
                console.log(res.stdout)
            }
        }
        return res.stdout
    }
}

async function exec(ssh, cmd, stdin, logger = null, in_vm = false) {
    if (logger) {
        await logger.write('$-> ')
        await logger.write(cmd)
        await logger.write('\n')
    }
    else {
        console.log('$-> ' + cmd)
    }
    if (stdin) {
        if (logger) {
            await logger.write(stdin)
            await logger.write('\n')
        }
        else {
            console.log(stdin)
        }
    }
    if (ssh.docker_name && !in_vm) {
        if (stdin) {
            cmd = 'docker exec -i -w ' + ssh.base_dir + ' ' + ssh.docker_name + ' ' + cmd
        }
        else {
            cmd = 'docker exec -w ' + ssh.base_dir + ' ' + ssh.docker_name + ' ' + cmd
        }
    }
    const res = await ssh.execCommand(cmd, { stdin: stdin, cwd: ssh.docker_name ? null : ssh.base_dir })
    return do_result(res, logger)
}

async function copy(ssh, remote, local, logger) {
    if (!ssh.docker_name) {
        throw new Error('not in docker')
    }
    let cmd = 'docker cp ' + ssh.docker_name + ':' + ssh.base_dir + remote + ' ' + local
    await logger.write('$-> ')
    await logger.write(cmd)
    await logger.write('\n')

    const res = await ssh.execCommand(cmd)
    return do_result(res, logger)
}

async function build_docker_image(ssh, dir, docker_file, tag, version, logger) {
    if (!ssh.docker_name) {
        throw new Error('not in docker')
    }
    let cmd = `docker build -t ${tag}:${version} -t ${tag}:latest -f ${docker_file} ${dir}`
    await logger.write('$-> ')
    await logger.write(cmd)
    await logger.write('\n')

    const res = await ssh.execCommand(cmd)
    return do_result(res, logger)
}

module.exports = {
    copy_to_vm, restart_agent, clear_vm, connect_shell,
    update_vm_servers, exec, copy, build_docker_image, get_vm_config, update_vm_config
}