const { m_deploy_stream } = require('../data')
const { Op } = require('sequelize')
const Server = require('./server')
const FLAGS = require('../flags')

async function do_task_begin(task) {
    let target_version = null
    if (task.op === 1) {
        const upload_task = await m_deploy_stream.findOne({
            where: { server: task.server, op: 0, status: FLAGS.DEPLOY_STATUS_DONE },
            order: [['mtime', 'DESC']],
            limit: 1
        })
        if (upload_task === null) {
            m_deploy_stream.update({
                status: FLAGS.DEPLOY_STREAM_STATUS_ERROR,
                content: { ...task.content, err: 'previous version number is not find' }
            }, { where: { id: task.id } })
            throw new Error('do rollback fail, no version to do rollback')
        }
        target_version = upload_task.content.old_version
    }
    else {
        target_version = task.content.target_version
    }

    const [num] = await m_deploy_stream.update({ status: FLAGS.DEPLOY_STREAM_STATUS_DOING }, { where: { id: task.id, status: FLAGS.DEPLOY_STREAM_STATUS_PREPARE } })
    if (num !== 1) {
        // stop by user
        return { ok: false }
    }
    return { ok: true, target_version }
}

async function do_task(task, target_version) {
    if (task.op === 0) {
        // upload
        let old_version = null
        try {
            old_version = await Server.restart(task.server, target_version)
        }
        catch (err) {
            await m_deploy_stream.update({
                status: FLAGS.DEPLOY_STREAM_STATUS_ERROR,
                content: { ...task.content, err: err.message }
            },
                { where: { id: task.id } })
            throw err
        }
        await m_deploy_stream.update({
            status: FLAGS.DEPLOY_STREAM_STATUS_DONE,
            content: { ...task.content, old_version: old_version }
        },
            { where: { id: task.id } })

    }
    else if (task.op === 1) {
        // rollback
        let old_version = null
        try {
            old_version = await Server.restart(task.server, target_version)
        }
        catch (err) {
            await m_deploy_stream.update({
                status: FLAGS.DEPLOY_STREAM_STATUS_ERROR,
                content: { ...task.content, err: err.message }
            },
                { where: { id: task.id } })
            throw err
        }
        await m_deploy_stream.update({
            status: FLAGS.DEPLOY_STREAM_STATUS_DONE,
            content: { ...task.content, old_version: old_version }
        }, { where: { id: task.id } })
    }
}

// Parallelism between servers
let map = new Map()

async function do_task_wrapper(task) {
    try {
        const res = await do_task_begin(task)
        if (!res.ok) {
            map.delete(task.server)
            return
        }
        const fn = async () => {
            try {
                await do_task(task, res.target_version)
            }
            catch (err) {
                console.error(err)
            }
            finally {
                map.delete(task.server)
            }
        }
        fn()
    }
    catch (e) {
        console.error(e)
        map.delete(task.server)
    }
}

async function run() {
    const time = new Date().valueOf() + 999
    const task = await m_deploy_stream.findOne({
        where: {
            target_time: { [Op.lte]: time },
            status: { [Op.eq]: FLAGS.DEPLOY_STREAM_STATUS_PREPARE }
        },
        order: [['target_time', 'ASC']],
        limit: 1
    })

    if (task) {
        if (map.get(task.server)) {
            // ignore
            // do task next tick
            console.error('ignore task ' + task.server)
        }
        else {
            map.set(task.server, task)
            // do not await
            await do_task_wrapper(task)
        }
    }

    const next_task = await m_deploy_stream.findOne({
        where: {
            status: { [Op.eq]: FLAGS.DEPLOY_STREAM_STATUS_PREPARE }
        },
        order: [['target_time', 'ASC']],
        limit: 1
    })

    if (next_task) {
        let t = next_task.target_time - new Date().valueOf()
        if (t <= 0) {
            t = 0
        }
        console.log('do next deploy after ' + Math.floor(t / 1000) + 's')
        setTimeout(run, t)
    }
    else {
        console.log('no need do deploy')
    }
}

function update_tasks(new_time) {
    if (new_time === null)
        new_time = new Date().valueOf()

    let t = new_time - new Date().valueOf()
    if (t <= 0) {
        t = 0
    }
    setTimeout(run, t)
}

// unfinished tasks
function init() {
    setTimeout(run, 1000)
}

module.exports = { init, update_tasks }