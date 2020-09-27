
async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const logger = opt.logger
        const ssh = opt.ssh
    }
}

const params = [
]

const pipeline_params = [
    { name: 'docker_file', label: 'Dockerfile', description: 'How to build image?', type: 'script' }
]

const deps = []

module.exports = { entry, name: 'deploy-click', description: 'One-Click deployment system', tag: ['deploy'], type: 'deploy', params, pipeline_params, deps }