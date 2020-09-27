const { conn, m_pipeline, m_server, m_mode, m_vm } = require('../data')
const { run_job, get_job_deps, close_job } = require('../plugin/index')
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
    try {
        if (pip.close) {
            throw 'stop by user'
        }
        await logger.split('environment')
        ssh = await run_job(env_job.name, env_job.param, { deps, logger, id })
        if (pip.close) {
            throw 'stop by user'
        }
        await logger.split('source')
        await update_flag(id, FLAGS.PIPE_STAGE_SOURCE)
        for (const job of pipeline.content.jobs.source) {
            await run_job(job.name, job.param, { ssh, logger, id })
        }
        if (pip.close) {
            throw 'stop by user'
        }
        await logger.split('build')
        await update_flag(id, FLAGS.PIPE_STAGE_BUILD)
        for (const job of pipeline.content.jobs.build) {
            await run_job(job.name, job.param, { ssh, logger, id })
        }
        if (pip.close) {
            throw 'stop by user'
        }
        await logger.split('deploy')
        await update_flag(id, FLAGS.PIPE_STAGE_DEPLOY)
        for (const job of pipeline.content.jobs.deploy) {
            await run_job(job.name, job.param, { ssh, logger, id })
        }
        await update_flag(id, FLAGS.PIPE_STAGE_DONE)
    }
    catch (e) {
        try {
            await logger.write(e + '\n')
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
            await close_job(env_job.name, env_job.param, { logger, id, ssh })
        }
        catch (e) { console.error(e) }
        try {
            pipes.delete(id)
            await logger.close()
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
    await remove(id)
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

async function listen_log(id, send, close) {
    let v = pipes.get(id)
    if (v === undefined || v === null) {
        // read log file
        const path = log_path(id)
        const file = await fs.open(path, 'r')
        let buf = Buffer.allocUnsafe(4096)
        try {
            while (1) {
                const { bytesRead } = await file.read(buf, 0, 4096)
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
        const logger = v.logger
        const path = log_path(id)
        const file = await fs.open(path, 'r')
        let buf = Buffer.allocUnsafe(4096)
        try {
            while (1) {
                const { bytesRead } = await file.read(buf, 0, 4096)
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
            close()
            return
        }
        logger.add_listener(listener)
    }
}

module.exports = { run, stop, listen_log }