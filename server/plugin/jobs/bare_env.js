const { connect_shell } = require('./../../utils/vmutils')
const { m_vm } = require('../../data')
const { install_deps } = require('./comm/install')

async function exec(ssh, cmd, stdin, logger) {
    await logger.write('$>')
    await logger.write(cmd)
    await logger.write('\n')
    if (stdin) {
        await logger.write(stdin)
        await logger.write('\n')
    }
    const res = await ssh.execCommand(cmd, { stdin: stdin })
    console.log(res)
}

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const logger = opt.logger
        await logger.write('startup bare environment\n')
        const vm = await m_vm.findByPk(param.vm_name)
        await logger.write('try connect environment\n')

        const ssh = await connect_shell(vm.ip, vm.port, vm.password, vm.private_key, vm.user)
        await logger.write('try install deps\n')
        await install_deps(ssh, opt.deps)
        await logger.write('try do post install script\n')
        await exec(ssh, 'cat | sh', param.post_install_script, logger)
    }
}

const params = []
const pipeline_params = [{ name: 'vm_name', label: 'Vm to execute', type: 'select VM' },
{ name: 'post_install_script', label: 'Post-install script', type: 'script' }]

module.exports = {
    entry, name: 'bare-env', description: 'virtual machine environment', tag: [], type: 'env',
    params, pipeline_params
}
