const { conn, m_pipeline, m_server, m_mode, m_vm } = require('../data')
const { run_job, get_job_deps } = require('../plugin/index')
const { LogStream, remove, log_path } = require('../utils/log_stream')
const fs = require('fs').promises

async function init_log(id) {
    const logger = new LogStream(id)
    await logger.init()
    return logger
}

let pipes = new Map()

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
    try {
        if (pip.close) {
            throw 'stop by user'
        }
        await logger.split('environment')
        const ssh = await run_job(env_job.name, env_job.param, { deps, logger })
        if (pip.close) {
            throw 'stop by user'
        }
        await logger.split('source')
        for (const job of pipeline.content.jobs.source) {
            await run_job(job.name, job.param, { ssh, logger })
        }
        if (pip.close) {
            throw 'stop by user'
        }
        await logger.split('build')
        for (const job of pipeline.content.jobs.build) {
            await run_job(job.name, job.param, { ssh, logger })
        }
        if (pip.close) {
            throw 'stop by user'
        }
        await logger.split('deploy')
        for (const job of pipeline.content.jobs.deploy) {
            await run_job(job.name, job.param, { ssh, logger })
        }
    }
    catch (e) {
        console.error(e)
        try {
            await logger.write(e + '\n')
        }
        catch (e2) {
        }
    }
    finally {
        pipes.delete(id)
        await logger.close()
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
        const logger = v.logger
    }
}

module.exports = { run, stop, listen_log }