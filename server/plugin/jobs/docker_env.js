const { connect_shell, exec, exec_script } = require('./../../utils/vmutils')
const { m_vm, m_docker_cache, m_pipeline } = require('../../data')
const { install_deps } = require('./comm/install')
const { get_script_content } = require('./../../utils/script')

async function entry(request, param, opt) {
    if (request === 'valid') {
        return ''
    }
    else if (request === 'run') {
        // connect ssh
        const logger = opt.logger
        await logger.write('- startup bare environment\n')
        await logger.write('- target vm is ' + param.vm_name + '\n')
        const vm = await m_vm.findByPk(param.vm_name)
        await logger.write('- connecting environment\n')
        const ssh = await connect_shell(vm)

        const pipeline = await m_pipeline.findByPk(opt.id)

        let docker_name = null
        let cache = await m_docker_cache.findOne({ where: { mode_name: pipeline.mode_name, vm_name: param.vm_name } })
        // select cached docker 
        await logger.write('- detecting docker container to reuse.\n')
        console.log(cache)
        if (cache && cache.docker_names && cache.docker_names.names && cache.docker_names.names.length > 0) {
            let len = cache.docker_names.names.length
            for (let i = cache.docker_names.names.length - 1; i >= 0; i--) {
                docker_name = cache.docker_names.names[i]
                try {
                    const data = await exec(ssh, `docker stats ${docker_name} --no-stream --format "{{.Name}}"`, null, logger)
                    if (data !== docker_name) {
                        docker_name = null
                    }
                    else {
                        break;
                    }
                }
                catch (e) {
                    docker_name = null
                }
                len--
            }
            cache.docker_names.names.length = len
        }
        const is_new = docker_name === null
        if (is_new) {
            docker_name = 'pipe_' + opt.id
        }
        if (cache) {
            if (is_new)
                cache.docker_names.names.push(docker_name)
            const [num] = await m_docker_cache.update({ docker_names: cache.docker_names, version: cache.version + 1 },
                { where: { mode_name: pipeline.mode_name, vm_name: param.vm_name, version: cache.version } })
            if (num !== 1) throw new Error('update docker cache version fail')
        }
        else {
            let docker_names = { names: [] }
            if (is_new)
                docker_names.names.push(docker_name)

            await m_docker_cache.create({ docker_names: docker_names, mode_name: pipeline.mode_name, vm_name: param.vm_name, version: 0 })
        }

        if (is_new) {
            // await logger.write('- pulling docker image\n')
            // await exec(ssh, 'docker pull ' + param.dockerimg, null, logger)
            await logger.write('- connecting docker environment\n')
            await exec(ssh, 'docker run -d --name ' + docker_name + ' ' + param.dockerimg + ' /bin/tail -f', null, logger)
            await logger.write('- installing deps\n')
            ssh.docker_name = docker_name
            ssh.base_dir = '/root/'

            await install_deps(ssh, opt.deps, logger)
            if (param.post_install_script) {
                await logger.write('- do post install script\n')
                await exec_script(ssh, await get_script_content(param.post_install_script), logger)
            }
            else {
                await logger.write('- no need to execute post install script\n')
            }
        }
        else {
            await logger.write('- note docker container is already existed, reuse it.\n')
            // run it if not running
            if (await exec(ssh, `docker ps --filter name=${docker_name} --format "{{.Names}}"`, null, logger) !== docker_name) {
                // start it
                await logger.write('- start container\n')
                await exec(ssh, `docker start ${docker_name}`, null, logger)
            }
            ssh.docker_name = docker_name
            ssh.base_dir = '/root/'
        }

        return ssh
    }
    else if (request === 'close') {
        const logger = opt.logger
        let ssh = opt.ssh
        try {
            if (ssh === undefined || ssh === null) {
                const vm = await m_vm.findByPk(param.vm_name)
                ssh = await connect_shell(vm)
            }
        }
        catch (e) {
            console.error(e)
        }
        if (opt.reserve) { // reserve docker container
            try {
                await logger.write('- finish (reserved)\n')
            }
            catch (e) { }
            if (ssh)
                ssh.dispose()
            return
        }

        try {
            await logger.write('- finish\n')
            let name
            if (!ssh.docker_name) {
                name = 'pipe_' + opt.id
            }
            else {
                name = ssh.docker_name
            }
            ssh.docker_name = null
            ssh.base_dir = '/'
            await exec(ssh, 'docker stop ' + name, null, logger)
            await exec(ssh, 'docker rm ' + name, null, logger)
        }
        catch (e) {
            console.error(e)
        }
        finally {
            ssh.dispose()
        }
    }
    else if (request === 'clean') {
        const vm = await m_vm.findByPk(param.vm_name)
        const ssh = await connect_shell(vm)
        const pipeline = await m_pipeline.findByPk(opt.id)
        let cache = await m_docker_cache.findOne({ where: { mode_name: pipeline.mode_name, vm_name: param.vm_name } })
        // select cached docker 
        if (cache && cache.docker_names && cache.docker_names.names && cache.docker_names.names.length > 0) {
            await m_docker_cache.destroy({ where: { mode_name: pipeline.mode_name, vm_name: param.vm_name } })
            const fn = async () => {
                for (let i = cache.docker_names.names.length - 1; i >= 0; i--) {
                    docker_name = cache.docker_names.names[i]
                    try {
                        await exec(ssh, 'docker stop ' + name, null, null)
                    }
                    catch (e) {
                    }
                    try {
                        await exec(ssh, 'docker rm ' + name, null, null)
                    }
                    catch (e) {
                    }
                }
                ssh.dispose()
            }
            // do it async and return now
            fn()
        }
    }
}


const params = [{ name: 'dockerimg', label: 'docker image name', type: 'string', default: 'archlinux:latest', description: 'Docket base image for environment.' }]
const pipeline_params = [{ name: 'vm_name', label: 'Vm to run', description: 'Which virtual machine is ready to run the pipeline?', type: 'select VM' },
{ name: 'post_install_script', label: 'Post-install script', description: 'The script is executed when the environment is ready.', type: 'script' }]

module.exports = {
    entry, name: 'docker-env', description: 'pull docker image and startup base environment', tag: ['docker'], type: 'env',
    params, pipeline_params
}