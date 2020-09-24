const { connect_shell, exec } = require('./../../utils/vmutils')
const { m_vm } = require('../../data')
const { install_deps } = require('./comm/install')

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const logger = opt.logger
        await logger.write('- startup bare environment\n')
        await logger.write('- target vm is ' + param.vm_name + '\n')
        const vm = await m_vm.findByPk(param.vm_name)
        await logger.write('- connecting environment\n')
        const ssh = await connect_shell(vm.ip, vm.port, vm.password, vm.private_key, vm.user)
        await logger.write('- installing deps\n')
        await install_deps(ssh, opt.deps, logger)
        if (param.post_install_script) {
            await logger.write('- do post install script\n')
            const sc = await fs.readFile(__dirname + '/../../upload/scripts/' + param.post_install_script)
            await exec(ssh, 'cat > tmp.sh', sc.toString(), logger)
            await exec(ssh, 'sh ./tmp.sh', null, logger)
            await exec(ssh, 'rm ./tmp.sh', null, logger)
        }
        else {
            await logger.write('- no need to execute post install script\n')
        }
    }
    else if (request === 'close') {
        const logger = opt.logger
        try {
            await exec(ssh, 'logout', null, logger)
        }
        catch (e) {
        }
        finally {
            ssh.dispose()
        }
    }
}

const params = []
const pipeline_params = [{ name: 'vm_name', label: 'Vm to run', description: 'Which virtual machine is ready to run the pipeline?', type: 'select VM' },
{ name: 'post_install_script', label: 'Post-install script', description: 'The script is executed when environment is ready.', type: 'script' }]

module.exports = {
    entry, name: 'bare-env', description: 'virtual machine environment', tag: [], type: 'env',
    params, pipeline_params
}
