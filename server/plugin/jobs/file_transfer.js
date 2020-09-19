const { m_vm } = require('../../data')
async function entry(request, param) {
    if (request === 'valid') {
        if (await m_vm.findByPk(param.vm_name)) {
            return ''
        }
        return 'vm not exist'
    }
}

const params = [
    { name: 'vm_name', label: 'VM', type: 'select VM' },
    { name: 'path', label: 'path', type: 'string', default: './' }
]

const pipeline_params = []

module.exports = { entry, name: 'file-transfer', description: 'Transfer build result file to ssh target', tag: ['ssh'], type: 'deploy', params, pipeline_params }