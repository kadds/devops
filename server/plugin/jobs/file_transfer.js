const { m_vm, m_pipeline } = require('../../data')
const { exec } = require('./../../utils/vmutils')

async function entry(request, param, opt) {
    if (request === 'valid') {
        if (await m_vm.findByPk(param.vm_name)) {
            return ''
        }
        return 'vm not exist'
    }
    else if (request === 'run') {
        const logger = opt.logger
        const ssh = opt.ssh
        const vm = await m_vm.findByPk(param.vm_name)
        if (!vm) {
            throw '(transfer target) vm not find vm name is ' + param.vm_name
        }
        let pipeline = await m_pipeline.findByPk(opt.id)
        const path = param.path.replace('${pipeline_id}', opt.id)
            .replace('${module_name}', pipeline.mode_name)
            .replace('${vm_name}', param.vm_name)
            .replace('${timestamp}', Math.floor(new Date().valueOf() / 1000))

        await logger.write('- file transfer target path is ' + path + '\n')
        await exec(ssh, `rsync -aue 'ssh -p ${vm.port}' ${ssh.base_dir}/${opt.result_dir} ${vm.user}@${vm.ip}:${path}`, vm.password, logger)
    }
}

const params = [
]

const pipeline_params = [
    { name: 'vm_name', label: 'VM', type: 'select VM', description: 'Transform target. Not support private key.' },
    {
        name: 'path', label: 'path', type: 'string', default: './',
        description: 'Target machine pathname. Some of variable: ${pipeline_id}, ${module_name}, ${vm_name}, ${timestamp}'
    }
]

const deps = ['openssh', 'rsync']

module.exports = { entry, name: 'file-transfer', description: 'Transfer build result file to ssh target', tag: ['ssh'], type: 'deploy', params, pipeline_params, deps }