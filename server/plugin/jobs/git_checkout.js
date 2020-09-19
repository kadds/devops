const simpleGit = require('simple-git');
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

async function git_checkout(url, branch, path) {
    const git = simpleGit()
    const init = await git.init()
    const res = await git.clone(url, path, ['--bare', '--single-branch', '--depth=1', '--branch=' + branch])
    return
}

async function entry(request, param) {
    if (request === 'valid') {
        let removeCallback = null
        try {
            const { name, remove } = await tmp_dir()
            removeCallback = remove
            await git_checkout(param.url, param.branch, name)
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

module.exports = { entry, name: 'git-checkout', description: 'clone git repository code to local', tag: ['git'], type: 'source', params, pipeline_params }