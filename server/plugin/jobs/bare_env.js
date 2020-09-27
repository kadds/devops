const { connect_shell, exec } = require('./../../utils/vmutils')
const { m_vm } = require('../../data')
const { install_deps } = require('./comm/install')
const { get_script_content } = require('./../../utils/script')

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
        const base_dir = param.base_dir + '/' + opt.id + '/'
        await logger.write('- checking directory\n')
        if (param.base_dir.indexOf(' ') >= 0) {
            throw 'invalid parameter base_dir ' + param.base_dir
        }
        await exec(ssh, 'mkdir -p ' + base_dir, null, logger)
        ssh.base_dir = base_dir
        await logger.write('- installing deps\n')
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
        const base_dir = param.base_dir + '/' + opt.id + '/'
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
            if (param.base_dir.indexOf(' ') < 0) {
                await exec(ssh, 'rm -rf ' + base_dir, null, logger)
            }
            ssh.base_dir = param.base_dir
            await exec(ssh, 'exit', null, logger)
        }
        catch (e) {
            console.error(e)
        }
        finally {
            ssh.dispose()
        }
    }
}

const params = []
const pipeline_params = [{ name: 'vm_name', label: 'Vm to run', description: 'Which virtual machine is ready to run the pipeline?', type: 'select VM' },
{ name: 'base_dir', label: 'Base Directory', description: 'Directory for preparing environment and building source code. (Don\'t use ~)', type: 'string', default: '/tmp/' },
{ name: 'post_install_script', label: 'Post-install script', description: 'The script is executed when environment is ready.', type: 'script' }]

module.exports = {
    entry, name: 'bare-env', description: 'virtual machine environment', tag: [], type: 'env',
    params, pipeline_params
}
