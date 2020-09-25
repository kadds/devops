const { exec } = require('./../../utils/vmutils')

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const logger = opt.logger
        const ssh = opt.ssh
        await exec(ssh, param.cmake_command, null, logger)
        return param.result_dir
    }
}

const params = [
]

const pipeline_params = [
    { name: 'dependence', label: 'Dependence list', description: 'Package name split by \\n', type: 'text', default: '' }
]

const deps = []
module.exports = { entry, name: 'dependence', description: 'Download dependence from package manager', tag: [], type: 'source', params, pipeline_params, deps }

