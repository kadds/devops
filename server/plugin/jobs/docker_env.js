
async function entry(request, param) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {

    }
}

const params = [{ name: 'dockerimg', label: 'docker image name', type: 'string' }]

module.exports = {
    entry, name: 'docker-env', description: 'pull docker image and startup base environment', tag: ['docker'], type: 'env',
    params
}