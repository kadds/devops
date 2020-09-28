const { m_deploy, m_pipeline } = require('../../data')
const FLAGS = require('../../flags')
async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        const logger = opt.logger
        const ssh = opt.ssh
        let deploy = {}
        deploy.pipeline_id = opt.id
        let pipeline = await m_pipeline.findByPk(opt.id)
        deploy.mode_name = pipeline.mode_name
        if (deploy.mode_name === null) {
            throw 'unknown module in pipeline ' + opt.id
        }
        deploy.status = FLAGS.DEPLOY_STATUS_INIT
        deploy.content = {}
        deploy.content.do_count = 0
        deploy.content.test_server = null
        deploy.content.image_name = 'deploy_' + deploy.mode_name + '_' + opt.id
        const res = await m_deploy.create(deploy)
        pipeline = await m_pipeline.findByPk(opt.id)
        pipeline.content.deploy_id = res.id
        await m_pipeline.update({ content: pipeline.content }, { where: { id: opt.id } })
        logger.write('- update deployment information done')
    }
}

const params = [
]

const pipeline_params = [
    { name: 'docker_file', label: 'Dockerfile', description: 'How to build image?', type: 'script' }
]

const deps = []

module.exports = { entry, name: 'deploy-click', description: 'One-Click deployment system', tag: ['deploy'], type: 'deploy', params, pipeline_params, deps }