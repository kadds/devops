const tmp = require('tmp');
const { exec } = require('./../../utils/vmutils')

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

async function entry(request, param, opt) {
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
    }
    else if (request === 'run') {
        const logger = opt.logger
        const ssh = opt.ssh
        await exec(ssh, 'git clone --depth=1 --single-branch --branch ' + param.branch + ' ' + param.git_url + ' ./', null, logger)
    }
}

const params = [
    { name: 'git_url', label: 'url', description: 'The git repository address', type: 'string' },
    { name: 'branch', label: 'branch name', description: 'Which branch contains source code for building?', type: 'string', default: 'master' }
]

const pipeline_params = [
]

const deps = [
    'git'
]

module.exports = { entry, name: 'git-checkout', description: 'clone git repository code to local', tag: ['git'], type: 'source', params, pipeline_params, deps }