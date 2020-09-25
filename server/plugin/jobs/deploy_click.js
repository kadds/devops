
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
]

const pipeline_params = [
]

const deps = []

module.exports = { entry, name: 'deploy-click', description: 'One-Click deployment system', tag: ['deploy'], type: 'deploy', params, pipeline_params, deps }