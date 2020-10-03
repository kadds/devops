const { Router } = require('express')
const { m_deploy, m_pipeline, m_server } = require('../data')
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
    const content_servers = deploy.content.servers || []
    const map = new Map()

    for (const server of content_servers) {
        if (server.status !== 'stop')
            map.set(server.name, server)
    }

    const servers = (await m_server.findAll({ where: { mode_name: deploy.mode_name } }))
        .map(v => {
            return {
                name: v.name,
                is_test: v.flag & FLAGS.SVR_FLAG_TEST,
                version: v.content.version,
                can_upload: !map.has(v.name) || (map.has(v.name) && map.get(v.name).op !== 'upload'),
                can_rollback: map.has(v.name) && map.get(v.name).op !== 'rollback',
            }
        })

    let data = {}
    data.id = deploy.id
    data.mode_name = deploy.mode_name
    data.pipeline_id = deploy.pipeline_id
    data.status = deploy.status
    data.all = servers
    data.op_list = content_servers.reverse()
    rsp.json({ err: 0, data })
})

router.post('/upload', async (req, rsp, next) => {
    let deploy = await m_deploy.findByPk(req.body.id)
    if (!deploy) {
        rsp.json({ err: 404, msg: 'not find deploy' })
        return
    }
    const content = deploy.content
    const servers = content.servers || []
    const opt = req.body.opt || { interval: 30 }
    for (const server of req.body.servers) {
        servers.push({
            name: server, ctime: new Date().valueOf(), mtime: new Date().valueOf(),
            status: 'prepare', interval: opt.interval, op: 'upload', index: servers.length - 1,
            start_time: servers.length !== 0 ? servers[servers.length - 1].start_time + opt.interval : new Date().valueOf()
        })
    }
    content.servers = servers
    await m_deploy.update({ content, version: deploy.version + 1 },
        { where: { id: deploy.id, version: deploy.version } })

    rsp.json({ err: 0 })
})

router.post('/rollback', async (req, rsp, next) => {
    let deploy = await m_deploy.findByPk(req.body.id)
    if (!deploy) {
        rsp.json({ err: 404, msg: 'not find deploy' })
        return
    }
    const content = deploy.content
    const servers = content.servers || []
    const opt = req.body.opt || { interval: 30 }
    for (const server of req.body.servers) {
        servers.push({
            name: server, ctime: new Date().valueOf(), mtime: new Date().valueOf(),
            status: 'prepare', interval: opt.interval, op: 'rollback', index: servers.length - 1,
            start_time: servers.length !== 0 ? servers[servers.length - 1].start_time + opt.interval : new Date().valueOf()
        })
    }
    content.servers = servers
    await m_deploy.update({ content, version: deploy.version + 1 },
        { where: { id: deploy.id, version: deploy.version } })

    rsp.json({ err: 0 })
})

router.post('/stop', async (req, rsp, next) => {
    let deploy = await m_deploy.findByPk(req.body.id)
    if (!deploy) {
        rsp.json({ err: 404, msg: 'not find deploy' })
        return
    }
    const content = deploy.content
    const servers = content.servers || []
    for (const idx of req.body.index) {
        if (idx < servers) {
            servers[idx].status = 'stop'
        }
        else {
            rsp.json({ err: 109, msg: 'Unknown deployment index ' + idx });
            return
        }
    }
    content.servers = servers
    await m_deploy.update({ content, version: deploy.version + 1 },
        { where: { id: deploy.id, version: deploy.version } })

    rsp.json({ err: 0 })
})


const deploy = router
module.exports = deploy