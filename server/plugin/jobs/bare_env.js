async function entry(request, param) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {

    }
}

const params = []

module.exports = {
    entry, name: 'bare-env', description: 'virtual machine environment', tag: [], type: 'env',
    params
}