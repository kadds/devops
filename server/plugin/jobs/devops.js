
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
    { name: 'test_svr', label: 'Test server', description: 'Which server will be upgraded first for testing?', type: 'select Server' }
]

const deps = []

module.exports = { entry, name: 'devops', description: 'Resilient deployment of microservice systems', tag: ['devops'], type: 'deploy', params, pipeline_params, deps }