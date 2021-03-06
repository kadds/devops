const { install_deps } = require('./comm/install')

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const logger = opt.logger
        const ssh = opt.ssh
        const deps = param.dependence.split('\n')
        if (deps.length > 0) {
            await logger.write('- install dependencies by plugin dependence\n')
            await install_deps(ssh, deps, logger)
        }
        else {
            await logger.write('- install nothing by plugin dependence\n')
        }
    }
}

const params = [
]

const pipeline_params = [
    { name: 'dependence', label: 'Dependence list', description: 'Package name split by \\n', type: 'text', default: '' }
]

const deps = []
module.exports = { entry, name: 'dependence', description: 'Download dependence from package manager', tag: [], type: 'source', params, pipeline_params, deps }

