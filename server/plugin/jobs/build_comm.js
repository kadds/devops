const { exec } = require('./../../utils/vmutils')

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const logger = opt.logger
        const ssh = opt.ssh
        await exec(ssh, param.yarn_command, null, logger)
        return param.result_dir
    }
}

const params = []

const pipeline_params = [
    { name: 'build_command', label: 'command', type: 'text', default: '', description: 'Build command.' },
    { name: 'result_dir', label: 'Result directory', description: 'Relative path. Showing build results', type: 'string', default: 'build/' }
]

const deps = ['nodejs', 'yarn']

module.exports = { entry, name: 'build-comm', description: 'build by shell command', tag: [], type: 'build', params, pipeline_params, deps }