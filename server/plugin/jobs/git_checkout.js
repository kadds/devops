const { exec } = require('./../../utils/vmutils')

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const logger = opt.logger
        const ssh = opt.ssh
        let need_clone = true
        try {
            const status = await exec(ssh, 'cd proj && git status', null, logger)
            need_clone = false
        }
        catch (e) {
            console.log(e)
        }
        if (need_clone) {
            await exec(ssh, 'git clone --depth=1 --single-branch --branch ' + param.branch + ' ' + param.git_url + ' ./proj', null, logger)
        }
        else {
            await exec(ssh, 'cd proj && git pull', null, logger)
        }
        ssh.base_dir += '/proj'
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