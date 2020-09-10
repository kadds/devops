const { check_connection } = require('../../utils/vmutils')
async function entry(request, param) {
    if (request === 'valid') {
        try {
            await check_connection(param.ssh_host, 22, param.ssh_password, param.ssh_pkey, param.ssh_user)
        }
        catch (e) {
            console.log(e)
            return '' + e
        }
        return ''
    }
}

const params = [
    { name: 'ssh_host', label: 'ssh host', type: 'string' },
    { name: 'ssh_password', label: 'ssh password', type: 'string' },
    { name: 'ssh_pkey', label: 'ssh private_key', type: 'string' },
    { name: 'ssh_user', label: 'ssh user', type: 'string', default: 'root' },
    { name: 'path', label: 'path', type: 'string', default: './' }
]

module.exports = { entry, name: 'file-transfer', description: 'Transfer build result file to ssh target', tag: ['ssh'], type: 'deploy', params }