const { exec_shell } = require('./../../utils/vmutils')
async function entry(request, param) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        await exec_shell(param.post_install_script)
    }
}

const params = []
const pipeline_params = [{ name: 'vm_name', label: 'Vm to execute', type: 'select VM' },
{ name: 'post_install_script', label: 'Post-install script', type: 'script' }]

module.exports = {
    entry, name: 'bare-env', description: 'virtual machine environment', tag: [], type: 'env',
    params, pipeline_params
}