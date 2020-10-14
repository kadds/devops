const { m_deploy, m_pipeline } = require('../../data')
const tmp = require('tmp-promise')
const { exec, copy, build_docker_image } = require('../../utils/vmutils')
const FLAGS = require('../../flags')
const { get_script_content } = require('../../utils/script')
const Config = require('../../config')

tmp.setGracefulCleanup()

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
            throw new Error('unknown module in pipeline ' + opt.id)
        }
        deploy.status = FLAGS.DEPLOY_STATUS_INIT
        deploy.content = {}
        deploy.content.do_count = 0
        deploy.content.test_server = null

        const config = Config.get()
        const prefix = config.deploy.imagePrefix
        const postfix = config.deploy.imagePostfix

        deploy.content.image_name = prefix + deploy.mode_name + postfix + ':' + opt.id
        if (param.pre_build_cmd) {
            await logger.write('- do pre build command\n')
            await exec(ssh, 'sh', param.pre_build_cmd, logger)
        }

        const { path, cleanup } = await tmp.dir({ prefix: 'devops', unsafeCleanup: true })
        try {
            const docker_file = path + '/docker_build_file_.' + opt.id
            await logger.write('- copy build result from docker container\n')
            await copy(ssh, opt.result_dir, path, logger)
            await exec(ssh, 'cat > ' + docker_file, await get_script_content(param.docker_file), logger, true)
            await logger.write('- build new docker image\n')
            await build_docker_image(ssh, path, docker_file, 'deploy_' + deploy.mode_name, opt.id, logger)
        }
        catch (e) {
            cleanup()
            throw e
        }
        cleanup()

        const res = await m_deploy.create(deploy)
        // update res id
        pipeline = await m_pipeline.findByPk(opt.id)
        pipeline.content.deploy_id = res.id
        await m_pipeline.update({ content: pipeline.content }, { where: { id: opt.id } })
        logger.write('- update deployment information done\n')
    }
}

const params = [
]

const pipeline_params = [
    { name: 'pre_build_cmd', label: 'Pre build command', description: 'Run command before build docker image. Installing dependencies which used by binaries', type: 'script' },
    { name: 'docker_file', label: 'Build dockerfile', description: 'How to build image?', type: 'script' },
]

const deps = []

module.exports = { entry, name: 'deploy-click', description: 'One-Click deployment system', tag: ['deploy'], type: 'deploy', params, pipeline_params, deps }