const { connect_shell } = require('./../../utils/vmutils')
const { m_vm } = require('../../data')
const { install_deps } = require('./comm/install')

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const docker_name = opt.id
        const logger = opt.logger
        await logger.write('startup bare environment\n')
        const vm = await m_vm.findByPk(param.vm_name)
        await logger.write('try connect environment\n')
        const ssh = await connect_shell(vm.ip, vm.port, vm.password, vm.private_key, vm.user)
        await logger.write('pull docker image\n')
        await ssh.execCommand('docker pull ' + param.dockerimg)
        await ssh.execCommand('docker run -it --name ' + docker_name + ' ' + param.dockerimg + ' /bin/bash')
        await logger.write('try connect docker environment\n')
        await logger.write('try install deps\n')
        await install_deps(ssh, opt.deps, logger)
        await logger.write('try do post install script\n')
        await ssh.execCommand('cat | sh', { stdin: param.post_install_script })
    }
}

const params = [{ name: 'dockerimg', label: 'docker image name', type: 'string', default: 'archlinux:latest' }]
const pipeline_params = [{ name: 'vm_name', label: 'Vm to execute', type: 'select VM' },
{ name: 'post_install_script', label: 'Post-install script', type: 'script' }]

module.exports = {
    entry, name: 'docker-env', description: 'pull docker image and startup base environment', tag: ['docker'], type: 'env',
    params, pipeline_params
}