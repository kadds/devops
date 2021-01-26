const NodeSSH = require('node-ssh').NodeSSH
const { m_server, m_vm, m_variable } = require('../data')

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
        await ssh.execCommand('./agent signal -a stop', { cwd: vm.base_dir + '/agent' })
        // wait
        await new Promise((res) => {
            setTimeout(() => res(), 1000)
        })
    }
    catch (err) {
        console.error(err)
    }

    console.log('try to copy agent files')
    // if need upload agent.toml
    let res = await ssh.execCommand('cat ./agent.toml', { cwd: vm.base_dir + '/agent' })
    await ssh.execCommand('rm -rf ./agent', { cwd: vm.base_dir + '/' })

    if (!await ssh.putDirectory(local_dir, vm.base_dir + '/agent', {
        recursive: false, concurrency: 1,
        transferOptions: {
            chunkSize: 1024,
        },
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
    if ((res.code === null || res.code === 0) && res.stdout !== null && res.stdout !== "") {
        await ssh.execCommand('cat > ./agent.toml', { stdin: res.stdout, cwd: vm.base_dir + '/agent' })
    }
    console.log('try start agent')
    await ssh.execCommand('chmod +x ' + vm.base_dir + '/agent/agent')
    await ssh.exec('./agent run -d', [], {
        cwd: vm.base_dir + '/agent'
    })
    console.log('start agent done')
}

async function restart_agent(vm) {
    let ssh = await connect_shell(vm)
    try {
        await ssh.execCommand('./agent signal -a stop', { cwd: vm.base_dir + '/agent' })
        // wait 1s
        await new Promise((res) => {
            setTimeout(() => res(), 1000)
        })
    }
    catch (err) {
        console.error(err)
    }
    await ssh.exec('./agent run -d', [], {
        cwd: vm.base_dir + '/agent'
    })
    console.log('restart agent done')
}

async function reload_agent(vm) {
    let ssh = await connect_shell(vm)
    try {
        await ssh.execCommand('./agent signal -a reload', { cwd: vm.base_dir + '/agent' })
        // wait 1s
        await new Promise((res) => {
            setTimeout(() => res(), 1000)
        })
    }
    catch (err) {
        console.error(err)
    }
    console.log('reload agent done')
}

async function clear_vm(vm) {
    let ssh = await connect_shell(vm)
    try {
        await ssh.execCommand('./agent signal -a stop', { cwd: vm.base_dir + '/agent' })
    }
    catch (err) {
        console.log(err)
    }
    await ssh.execCommand('rm -f ./agent ./agent.toml ./agent_servers.txt', { cwd: vm.base_dir + '/agent' })
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
        await reload_agent(vm)
    }
    else {
        await ssh.execCommand('rm -f ./agent.toml', { cwd: vm.base_dir + '/agent' })
    }
}

async function update_vm_servers(vm_name) {
    const data = await m_server.findAll({ where: { vm_name: vm_name } })
    const vm = await m_vm.findByPk(vm_name)
    let servers = []
    for (const it of data) {
        servers.push(it.name)
    }
    let ssh = await connect_shell(vm)
    let str = vm_name + '\n'
    for (const name of servers) {
        str += name + '\n'
    }
    await ssh.execCommand('cat > ./agent_servers.txt', { stdin: str, cwd: vm.base_dir + '/agent' })
    await ssh.execCommand('./agent signal -a reload', { cwd: vm.base_dir + '/agent' })
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
        throw new Error('!!! execute fail. ')
    }
    else {
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
    const res = await ssh.execCommand(cmd, { stdin: stdin, cwd: ssh.docker_name ? null : ssh.base_dir, onStdout: v =>
        {
            logger && logger.write(v.toString())
        }
    , onStderr: v => { logger && logger.write(v.toString())} })
    return do_result(res, logger)
}

async function exec_script(ssh, script, logger, in_vm = false) {
    let env_list = await m_variable.findAll()
    if (logger) {
        await logger.write('$-> ')
        await logger.write(script)
        await logger.write('\n')
    }
    else {
        console.log('$-> ' + script)
    }
    let cmd = 'sh'
    if  (ssh.docker_name && !in_vm) {
        cmd = 'docker exec -i -w ' + ssh.base_dir + ' ' + ssh.docker_name + ' ' + cmd    
    }
    let new_script = ''
    for(const env of env_list) {
        new_script += 'export ' + env.name + '=' + env.value + '\n'
    }
    script = new_script + script
    const res = await ssh.execCommand(cmd, {cwd: ssh.docker_name ? null: ssh.base_dir, stdin: script, onStdout: v =>
        {
            logger && logger.write(v.toString())
        }
    , onStderr: v => { logger && logger.write(v.toString())} })

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

    const res = await ssh.execCommand(cmd, {
        onStdout: v => {
            logger && logger.write(v.toString())
        }
        , onStderr: v => { logger && logger.write(v.toString()) }
    })

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

    const res = await ssh.execCommand(cmd, {
        onStdout: v => {
            logger && logger.write(v.toString())
        }
        , onStderr: v => { logger && logger.write(v.toString()) }
    })

    return do_result(res, logger)
}

async function get_vm_detail(vm) {
    let ssh = await connect_shell(vm)
    let res
    res = await ssh.execCommand('cat /proc/cpuinfo | grep processor | wc -l')
    const cpu_num = parseInt(res.stdout)
    res = await ssh.execCommand('cat /proc/meminfo | grep MemTotal')
    const mem_total = Math.floor(parseInt(res.stdout.substr(res.stdout.indexOf(":") + 1)) / 1024)
    res = await ssh.execCommand('cat /proc/meminfo | grep MemAvailable')
    if (!res.stdout.startsWith("MemAvailable")) {
        res = await ssh.execCommand('cat /proc/meminfo | grep MemFree')
    }
    const mem_avl = Math.floor(parseInt(res.stdout.substr(res.stdout.indexOf(":") + 1)) / 1024)

    return { cpu_num, mem_total, mem_avl }
}

module.exports = {
    copy_to_vm, restart_agent, clear_vm, connect_shell, exec_script,
    update_vm_servers, exec, copy, build_docker_image, get_vm_config, update_vm_config,
    reload_agent, get_vm_detail
}