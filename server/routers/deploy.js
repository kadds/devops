const { Router } = require('express')
const { m_deploy, m_deploy_stream, m_pipeline, m_server } = require('../data')
const FLAGS = require('../flags')
const { post_deploy_task_op } = require('../worker/index')

let router = new Router()

router.get('/list', async (req, rsp, next) => {
    const page = req.query.page
    const size = req.query.size
    const { count, rows } = await m_deploy.findAndCountAll({ limit: size ? size : undefined, offset: size ? page * size : undefined, order: [['ctime', 'DESC']] })
    let list = []
    const fns = []
    for (const it of rows) {
        let item = {}
        fns.push(m_pipeline.findByPk(it.pipeline_id))
        item.id = it.id
        item.mode_name = it.mode_name
        item.pipeline_id = it.pipeline_id
        item.status = it.status
        item.ctime = it.ctime.valueOf()
        list.push(item)
    }

    const pipelines = await Promise.allSettled(fns)
    for (let i = 0; i < list.length; i++) {
        const pipeline = pipelines[i].value
        list[i].mark = pipeline.mark
    }

    rsp.json({ err: 0, list, total: count })
})

function is_done_task(task) {
    return (task.status === FLAGS.DEPLOY_STREAM_STATUS_STOP || task.status === FLAGS.DEPLOY_STREAM_STATUS_ERROR
        || task.status === FLAGS.DEPLOY_STREAM_STATUS_DONE)
}

router.get('', async (req, rsp, next) => {
    const id = req.query.id
    const deploy = await m_deploy.findByPk(id)
    if (!deploy) {
        rsp.json({ err: 404, msg: 'not find deploy' })
        return
    }
    const tasks = await m_deploy_stream.findAll({
        where: {
            deploy_id: id
        },
        order: [
            ['ctime', 'DESC']
        ]
    })

    const upload_map = new Map()
    const rollback_map = new Map()
    const op_list = []

    for (const task of tasks) {
        if (task.op === 0)
            upload_map.set(task.server, task)
        else
            rollback_map.set(task.server, task)

        op_list.push({
            ctime: task.ctime.valueOf(),
            mtime: task.mtime.valueOf(),
            target_time: task.target_time,
            server: task.server,
            op: task.op,
            status: task.status,
            id: task.id,
        })
    }

    const servers = (await m_server.findAll({ where: { mode_name: deploy.mode_name } }))
        .map(v => {
            return {
                name: v.name,
                is_test: v.flag & FLAGS.SVR_FLAG_TEST,
                version: v.content.version,
                can_upload: v.content.version !== deploy.pipeline_id && (v.status === FLAGS.SVR_STATUS_RUNNING || v.status === FLAGS.SVR_STATUS_STOPPED), // upload
                can_rollback: v.content.version === deploy.pipeline_id && (v.status === FLAGS.SVR_STATUS_RUNNING || v.status === FLAGS.SVR_STATUS_STOPPED), // rollback
            }
        })

    let data = {}
    data.id = deploy.id
    data.mode_name = deploy.mode_name
    data.pipeline_id = deploy.pipeline_id
    data.status = deploy.status
    data.all = servers
    data.op_list = op_list
    rsp.json({ err: 0, data })
})

router.post('/upload', async (req, rsp, next) => {
    let deploy = await m_deploy.findByPk(req.body.id)
    if (!deploy) {
        rsp.json({ err: 404, msg: 'not find deploy' })
        return
    }
    const opt = req.body.opt || { interval: 30 }
    const t = opt.interval * 1000
    let last_time = await m_deploy_stream.findOne({
        where: { deploy_id: deploy.id },
        order: [['target_time', 'DESC']],
        limit: 1
    })
    let now = new Date().valueOf()
    if (!last_time) {
        last_time = now - t
    }
    else {
        last_time = last_time.target_time
        if (last_time < now) {
            last_time = now - t
        }
    }
    const base_time = last_time

    for (const server of req.body.servers) {
        let r = {
            deploy_id: deploy.id,
            op: 0,
            server: server,
            status: FLAGS.DEPLOY_STREAM_STATUS_PREPARE,
            target_time: last_time + t,
            content: { target_version: deploy.pipeline_id }
        }
        await m_deploy_stream.create(r)
        last_time += t
    }
    post_deploy_task_op('new', base_time)

    rsp.json({ err: 0 })
})

router.post('/rollback', async (req, rsp, next) => {
    let deploy = await m_deploy.findByPk(req.body.id)
    if (!deploy) {
        rsp.json({ err: 404, msg: 'not find deploy' })
        return
    }
    const opt = req.body.opt || { interval: 10 }
    const t = opt.interval * 1000

    let last_time = await m_deploy_stream.findOne({
        where: { deploy_id: deploy.id },
        order: [['target_time', 'DESC']],
        limit: 1
    })

    let now = new Date().valueOf()
    if (!last_time) {
        last_time = now - t
    }
    else {
        last_time = last_time.target_time
        if (last_time < now) {
            last_time = now - t
        }
    }

    const base_time = last_time

    for (const server of req.body.servers) {
        let r = {
            deploy_id: deploy.id,
            op: 1,
            server: server,
            status: FLAGS.DEPLOY_STREAM_STATUS_PREPARE,
            target_time: last_time + t,
            content: {}
        }
        await m_deploy_stream.create(r)
        last_time += t
    }

    post_deploy_task_op('new', base_time)

    rsp.json({ err: 0 })
})

router.post('/stop', async (req, rsp, next) => {
    let deploy = await m_deploy.findByPk(req.body.id)
    if (!deploy) {
        rsp.json({ err: 404, msg: 'not find deploy' })
        return
    }

    for (const xid of req.body.ids) {
        await m_deploy_stream.update({ status: FLAGS.DEPLOY_STREAM_STATUS_STOP }, {
            where: { deploy_id: req.body.id, id: xid, status: FLAGS.DEPLOY_STREAM_STATUS_PREPARE },
        })
    }
    post_deploy_task_op('stop', null)

    rsp.json({ err: 0 })
})


const deploy = router
module.exports = deploy