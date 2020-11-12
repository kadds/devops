const { exec, exec_script } = require('./../../utils/vmutils')
const { get_script_content } = require('./../../utils/script')

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const logger = opt.logger
        const ssh = opt.ssh
        if (param.build_command)
            await exec_script(ssh, await get_script_content(param.build_command), logger)
        return param.result_dir
    }
}

const params = []

const pipeline_params = [
    { name: 'build_command', label: 'command', type: 'script', default: '', description: 'Build command.' },
    { name: 'result_dir', label: 'Result directory', description: 'Relative path. Showing build results', type: 'string', default: 'build/' }
]

const deps = []

module.exports = { entry, name: 'build-comm', description: 'build by shell command', tag: [], type: 'build', params, pipeline_params, deps }