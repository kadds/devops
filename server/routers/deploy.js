const { Router } = require('express')
const sequelize = require('sequelize')
const { m_deploy, m_deploy_stream, m_pipeline, m_server } = require('../data')
const FLAGS = require('../flags')
const data = require('../data')

let router = new Router()

router.get('/list', async (req, rsp, next) => {
    const page = req.query.page
    const size = req.query.size
    const data = await m_deploy.findAll()
    let list = []
    const ids = []
    const counts = []
    for (const it of data) {
        let item = {}
        const pipeline = await m_pipeline.findByPk(it.pipeline_id)
        const servers = await m_server.count({ where: { mode_name: it.mode_name } })
        item.id = it.id
        item.mode_name = it.mode_name
        item.pipeline_id = it.pipeline_id
        item.status = it.status
        item.test_server = it.content.test_server
        item.all_count = servers
        item.do_count = it.content.do_count
        item.reason = pipeline.mark
        list.push(item)
    }

    rsp.json({ err: 0, list })
})

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

    const map = new Map()
    const op_list = []

    for (const task of tasks) {
        if (task.status !== FLAGS.DEPLOY_STREAM_STATUS_STOP)
            map.set(task.server, task)
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
                can_upload: !map.has(v.name) || (map.has(v.name) && map.get(v.name).op !== 0), // upload
                can_rollback: map.has(v.name) && map.get(v.name).op !== 1, // rollback
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
    let last_time = await m_deploy_stream.findOne({
        where: { deploy_id: deploy.id },
        order: [['target_time', 'DESC']],
        limit: 1
    })
    if (!last_time) {
        last_time = new Date().valueOf()
    }
    else {
        last_time = last_time.target_time
    }

    const opt = req.body.opt || { interval: 30 }
    for (const server of req.body.servers) {
        let r = {
            deploy_id: deploy.id,
            op: 0,
            server: server,
            status: FLAGS.DEPLOY_STREAM_STATUS_PREPARE, op: 0,
            target_time: last_time + opt.interval * 1000
        }
        await m_deploy_stream.create(r)
    }

    rsp.json({ err: 0 })
})

router.post('/rollback', async (req, rsp, next) => {
    let deploy = await m_deploy.findByPk(req.body.id)
    if (!deploy) {
        rsp.json({ err: 404, msg: 'not find deploy' })
        return
    }
    let last_time = await m_deploy_stream.findOne({
        where: { deploy_id: deploy.id },
        order: [['target_time', 'DESC']],
        limit: 1
    })
    if (!last_time) {
        last_time = new Date().valueOf()
    }
    else {
        last_time = last_time.target_time
    }

    const opt = req.body.opt || { interval: 10 }
    for (const server of req.body.servers) {
        let r = {
            deploy_id: deploy.id,
            op: 0,
            server: server,
            status: FLAGS.DEPLOY_STREAM_STATUS_PREPARE, op: 0,
            target_time: last_time + opt.interval * 1000
        }
        await m_deploy_stream.create(r)
    }

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
            where: { deploy_id: req.body.id, id: xid },
        })
    }

    rsp.json({ err: 0 })
})


const deploy = router
module.exports = deploy