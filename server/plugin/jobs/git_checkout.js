const { exec } = require('./../../utils/vmutils')

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const logger = opt.logger
        const ssh = opt.ssh
        let need_clone = true
	let old_dir = ssh.base_dir
        try {
            ssh.base_dir += '/proj/'
            const status = await exec(ssh, 'git status', null, logger)
            need_clone = false
        }
        catch (e) {
            console.log(e)
        }
        if (need_clone) {
            ssh.base_dir = old_dir
            await exec(ssh, 'git clone --depth=1 --single-branch --branch ' + param.branch + ' ' + param.git_url + ' ./proj', null, logger)
	    ssh.base_dir += '/proj/'
        }
        else {
            await exec(ssh, 'git pull', null, logger)
        }
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
