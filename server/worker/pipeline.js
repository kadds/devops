const { Sequelize } = require('sequelize')
const { conn, m_pipeline, m_docker_cache, m_logs } = require('../data')
const { run_job, get_job_deps, close_job, clean_job } = require('../plugin/index')
const { LogStream, remove, log_path } = require('../utils/log_stream')
const fs = require('fs').promises
const FLAGS = require('../flags')

async function init_log(id) {
    const logger = new LogStream(id)
    await logger.init()
    return logger
}

let pipes = new Map()

async function update_flag(id, flag) {
    await m_pipeline.update({ stage: flag }, { where: { id: id } })
}

async function run(id) {
    const pipeline = await m_pipeline.findByPk(id)
    let deps = []
    for (const job of pipeline.content.jobs.source) {
        deps.push(...(await get_job_deps(job.name)))
    }
    for (const job of pipeline.content.jobs.build) {
        deps.push(...(await get_job_deps(job.name)))
    }
    for (const job of pipeline.content.jobs.deploy) {
        deps.push(...(await get_job_deps(job.name)))
    }
    const env_job = pipeline.content.jobs.env[0]
    let logger = await init_log(id)
    let pip = { close: false, logger }
    pipes.set(id, pip)
    let ssh = null
    // need clear cache?
    let reserve = false
    try {
        if (pip.close) {
            throw new Error('stop by user')
        }
        await logger.split('environment')
        ssh = await run_job(env_job.name, env_job.param, { deps, logger, id })
        if (pip.close) {
            throw new Error('stop by user')
        }
        reserve = true
        await logger.split('source')
        await update_flag(id, FLAGS.PIPE_STAGE_SOURCE)
        for (const job of pipeline.content.jobs.source) {
            await run_job(job.name, job.param, { ssh, logger, id })
        }
        // get source done
        if (pip.close) {
            throw new Error('stop by user')
        }
        await logger.split('build')
        await update_flag(id, FLAGS.PIPE_STAGE_BUILD)
        let result_dir = null
        for (const job of pipeline.content.jobs.build) {
            const dir = await run_job(job.name, job.param, { ssh, logger, id })
            if (dir) {
                result_dir = dir
            }
        }
        if (!result_dir) {
            throw new Error('can\'t get result, building plugin doesn\'t return a path.')
        }
        if (pip.close) {
            throw new Error('stop by user')
        }
        await logger.split('deploy')
        await update_flag(id, FLAGS.PIPE_STAGE_DEPLOY)
        for (const job of pipeline.content.jobs.deploy) {
            await run_job(job.name, job.param, { ssh, logger, id, result_dir })
        }
        await update_flag(id, FLAGS.PIPE_STAGE_DONE)
    }
    catch (e) {
        console.log(e)
        try {
            await logger.write(e.message + '\n')
        }
        catch (e2) {
            console.error(e2)
        }
        try {
            const pipeline = await m_pipeline.findByPk(id)
            let stage = FLAGS.PIPE_STAGE_ERR_UNKNOWN
            if (pipeline.stage === FLAGS.PIPE_STAGE_ENV)
                stage = FLAGS.PIPE_STAGE_ERR_ENV
            else if (pipeline.stage === FLAGS.PIPE_STAGE_BUILD)
                stage = FLAGS.PIPE_STAGE_ERR_BUILD
            else if (pipeline.stage === FLAGS.PIPE_STAGE_SOURCE)
                stage = FLAGS.PIPE_STAGE_ERR_SOURCE
            else if (pipeline.stage === FLAGS.PIPE_STAGE_DEPLOY)
                stage = FLAGS.PIPE_STAGE_ERR_DEPLOY
            await update_flag(id, stage)
        }
        catch (e3) {
            console.error(e3)
        }
    }
    finally {
        try {
            await logger.split('cleanup')
        }
        catch (e) { console.error(e) }
        try {
            await close_job(env_job.name, env_job.param, { logger, id, ssh, reserve })
        }
        catch (e) { console.error(e) }
        try {
                        await logger.close()
        }
        catch (e) { console.error(e) }
        try {
            let content = await fs.readFile(logger.path)
            content = content.toString('utf-8')
            await m_logs.create({ id, content })
        }
        catch (e) { console.error(e) }
        try {
            pipes.delete(id)
        }
        catch (e) { console.error(e) }
    }
}

async function stop(id) {
    let v = pipes.get(id)
    if (v) {
        v.close = true
        pipes.set(id, v)
    }
    // remove pipeline cache
    try {
        const pipeline = await m_pipeline.findByPk(id)
        const env_job = pipeline.content.jobs.env[0]
        const logger = new LogStream()
        logger.init_none()
        await close_job(env_job.name, env_job.param, { id, logger })
        await m_pipeline.update({ stage: FLAGS.PIPE_STAGE_ERR_UNKNOWN }, { where: { id, stage: [FLAGS.PIPE_STAGE_DEPLOY, FLAGS.PIPE_STAGE_BUILD, FLAGS.PIPE_STAGE_ENV, FLAGS.PIPE_STAGE_SOURCE] } })
    }
    catch (e) { console.error(e) }
}

async function rm(id) {
    let v = pipes.get(id)
    if (v) {
        v.close = true
        pipes.set(id, v)
    }
    // remove pipeline cache
    try {
        const pipeline = await m_pipeline.findByPk(id)
        const env_job = pipeline.content.jobs.env[0]
        const logger = new LogStream()
        logger.init_none()
        await clean_job(env_job.name, env_job.param, { id, logger })
    }
    catch (e) { console.error(e) }
    try {
        await m_pipeline.destroy({ where: { id } })
    }
    catch (e) { console.error(e) }

    // remove log file
    try {
        await remove(id)
    }
    catch (e) { console.error(e) }

    try {
        await m_logs.destroy({ where: { id } })
    }
    catch (e) { console.error(e) }
}

async function clean_cache(vm_name, module_name) {
    let pipelines = []
    if (vm_name && module_name) {
        pipelines = await m_docker_cache.findAll({ where: { mode_name: module_name, vm_name } })
    }
    else if (vm_name) {
        pipelines = await m_docker_cache.findAll({ where: { vm_name: vm_name } })
    }
    else if (module_name) {
        pipelines = await m_docker_cache.findAll({ where: { mode_name: module_name } })
    }
    let jobs = []
    for (const p of pipelines) {
        jobs.push(m_pipeline.findByPk(p.pipeline_id))
    }
    pipelines = []
    try {
        const data = await Promise.allSettled(jobs)
        for (const d of data) {
            pipelines.push(d.value)
        }
    }
    catch (e) {
        console.error(e)
    }
    jobs = []

    for (const pipeline of pipelines) {
        try {
            const env_job = pipeline.value.content.jobs.env[0]
            jobs.push(clean_job(env_job.name, env_job.param, { id: pipeline.value.id }))
        }
        catch (e) { console.error(e) }
    }
    try {
        await Promise.allSettled(jobs)
    }
    catch (e) {
        console.error(e)
    }
}

function do_ws_send(send, msg) {
    return new Promise((resolve, reject) => {
        send(msg, (err) => {
            if (err) {
                reject(err)
            }
            else {
                resolve()
            }
        })
    })
}

const length = 4096
async function listen_log(id, send, close) {
    const data = await m_logs.findByPk(id)
    if (data !== null) {
        try {
            await do_ws_send(send, data.content)
        }
        catch (e) {
            console.error(e)
        }
        finally {
            close()
        }
        return
    }
    let v = pipes.get(id)
    if (v === undefined || v === null) {
        // read log file
        let file
        try {
            const path = log_path(id)
            file = await fs.open(path, 'r')
        }
        catch (e) {
            console.error('log file not found id ' + id)
            close()
            return
        }
        let buf = Buffer.allocUnsafe(length)
        try {
            while (1) {
                const { bytesRead } = await file.read(buf, 0, length)
                if (bytesRead === 0) {
                    break;
                }
                await do_ws_send(send, buf.toString('utf8', 0, bytesRead))
            }
        }
        catch (e) {
            console.error(e)
        }
        finally {
            file.close()
            close()
        }
    }
    else {
        const logger = v.logger
        const listener = async (v) => {
            try {
                if (v === null) {
                    throw new Error(v)
                }
                await do_ws_send(send, v)
            }
            catch (e) {
                logger.rm_listener(listener)
                // send rest log
                try {
                    await do_ws_send(send, logger.get_current_buf())
                }
                catch (e) { console.error(e) }
                close()
            }
        }
        const path = log_path(id)
        const file = await fs.open(path, 'r')
        let buf = Buffer.allocUnsafe(length)
        try {
            while (1) {
                const { bytesRead } = await file.read(buf, 0, length)
                if (bytesRead === 0) {
                    // rest
                    break;
                }
                await do_ws_send(send, buf.toString('utf8', 0, bytesRead))
            }
        }
        catch (e) {
            console.error(e)
        }
        finally {
            file.close()
        }
        try {
            await do_ws_send(send, logger.get_current_buf())
        }
        catch (e) {
            logger.rm_listener(listener)
            close()
            return
        }
        logger.add_listener(listener)
    }
}

module.exports = { run, stop, listen_log, clean_cache, rm }