const tmp = require('tmp');

async function tmp_dir() {
    return new Promise((resolve, reject) => {
        tmp.dir({}, (err, name, remove) => {
            if (err) {
                reject(err)
            }
            else {
                resolve({ name, remove })
            }
        })
    })
}

async function entry(request, param) {
    if (request === 'valid') {
        let removeCallback = null
        try {
            const { name, remove } = await tmp_dir()
            removeCallback = remove
            removeCallback()
            return ''
        }
        catch (e) {
            console.log(e)
            if (removeCallback)
                removeCallback()
            return '' + e
        }
        return ''
    }
}

const params = [
    { name: 'url', label: 'git repository address', type: 'string' },
    { name: 'branch', label: 'branch', type: 'string', default: 'master' }
]

const pipeline_params = [
]

const deps = [
    'git'
]

module.exports = { entry, name: 'git-checkout', description: 'clone git repository code to local', tag: ['git'], type: 'source', params, pipeline_params, deps }