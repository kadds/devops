
async function entry(request, param) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {

    }
}

const params = [{ name: 'command', label: 'command', type: 'string', default: 'yarn build' }]
const pipeline_params = []

module.exports = { entry, name: 'yarn', description: 'build nodejs project by yarn', tag: ['yarn', 'nodejs'], type: 'build', params, pipeline_params }