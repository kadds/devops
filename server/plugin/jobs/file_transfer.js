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
]

const pipeline_params = [
    { name: 'vm_name', label: 'VM', type: 'select VM', description: 'Transform target.' },
    { name: 'path', label: 'path', type: 'string', default: './', description: 'Target machine pathname.' }
]

const deps = ['openssh']

module.exports = { entry, name: 'file-transfer', description: 'Transfer build result file to ssh target', tag: ['ssh'], type: 'deploy', params, pipeline_params, deps }