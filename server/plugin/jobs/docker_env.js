const { connect_shell, exec } = require('./../../utils/vmutils')
const { m_vm } = require('../../data')
const { install_deps } = require('./comm/install')
const { get_script_content } = require('./../../utils/script')

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const docker_name = 'pipe_' + opt.id
        const logger = opt.logger
        await logger.write('- startup bare environment\n')
        await logger.write('- target vm is ' + param.vm_name + '\n')
        const vm = await m_vm.findByPk(param.vm_name)
        await logger.write('- connecting environment\n')
        const ssh = await connect_shell(vm.ip, vm.port, vm.password, vm.private_key, vm.user)
        await logger.write('- pulling docker image\n')
        await exec(ssh, 'docker pull ' + param.dockerimg, null, logger)
        await logger.write('- connecting docker environment\n')
        await exec(ssh, 'docker run -d --name ' + docker_name + ' ' + param.dockerimg + ' /bin/tail -f', null, logger)
        await logger.write('- installing deps\n')
        ssh.docker_name = docker_name
        ssh.base_dir = '/root/'
        await install_deps(ssh, opt.deps, logger)
        if (param.post_install_script) {
            await logger.write('- do post install script\n')
            await exec(ssh, 'sh', get_script_content(param.post_install_script), logger)
        }
        else {
            await logger.write('- no need to execute post install script\n')
        }
        return ssh
    }
    else if (request === 'close') {
        const logger = opt.logger
        let ssh = opt.ssh
        try {
            if (ssh === undefined || ssh === null) {
                const vm = await m_vm.findByPk(param.vm_name)
                ssh = await connect_shell(vm.ip, vm.port, vm.password, vm.private_key, vm.user)
            }
        }
        catch (e) {
            console.error(e)
        }

        try {
            const name = 'pipe_' + opt.id
            ssh.docker_name = null
            await exec(ssh, 'docker stop ' + name, null, logger)
            await exec(ssh, 'docker rm ' + name, null, logger)
        }
        catch (e) {
            console.error(e)
        }
        finally {
            ssh.dispose()
        }
    }
}

const params = [{ name: 'dockerimg', label: 'docker image name', type: 'string', default: 'archlinux:latest', description: 'Docket base image for environment.' }]
const pipeline_params = [{ name: 'vm_name', label: 'Vm to run', description: 'Which virtual machine is ready to run the pipeline?', type: 'select VM' },
{ name: 'post_install_script', label: 'Post-install script', description: 'The script is executed when the environment is ready.', type: 'script' }]

module.exports = {
    entry, name: 'docker-env', description: 'pull docker image and startup base environment', tag: ['docker'], type: 'env',
    params, pipeline_params
}