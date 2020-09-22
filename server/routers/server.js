const { Router } = require('express')
const { conn, m_server, m_mode, m_vm } = require('../data')
const { post_task_server_op } = require('./../worker/index')
const { SVR_STATUS_INIT, SVR_STATUS_STOP, SVR_FLAG_TEST, SVR_FLAG_GRAY } = require('../flags')

let router = new Router()

router.get('/list', async (req, rsp, next) => {
    let servers = []
    if (req.query.name !== undefined && req.query.name !== null && req.query.name !== '') {
        const module = await m_mode.findByPk(req.query.name);
        if (module === null) {
            rsp.json({ err: 404, msg: 'not find any server in this module ' + req.query.name })
            return
        }
        servers = await m_server.findAll({ where: { mode_name: module.name } })
    }
    else {
        servers = await m_server.findAll({ where: {} })
    }
    let ms_servers = []
    for (let server of servers) {
        let it = {}
        it.name = server.name
        it.ctime = server.ctime.valueOf()
        it.mode_name = server.mode_name
        it.vm_name = server.vm_name
        it.status = server.status
        it.flag = server.flag
        ms_servers.push(it)
    }
    rsp.json({ err: 0, list: ms_servers })
})

router.get('', async (req, rsp, next) => {
    const server = await m_server.findByPk(req.query.name)
    let ms_server = {}
    ms_server.name = server.name
    ms_server.ctime = server.ctime.valueOf()
    ms_server.mode_name = server.mode_name
    ms_server.vm_name = server.vm_name
    ms_server.status = server.status
    ms_server.flag = server.flag
    if (server.content.res)
        ms_server.start_time = server.content.res.last_start_time
    rsp.json({ err: 0, data: ms_server })
})

router.post('/', async (req, rsp, next) => {
    // create server
    let data = {}
    const server = req.body.server
    data.name = server.name
    data.mode_name = server.mode_name
    data.vm_name = server.vm_name
    data.status = SVR_STATUS_INIT
    console.log(SVR_FLAG_TEST)
    data.flag = server.is_test ? (SVR_FLAG_TEST) : (server.is_gray ? SVR_FLAG_GRAY : 0)
    data.content = {}

    await m_server.create(data)
    post_task_server_op('init', server.name)
    rsp.json({ err: 0 })
})

router.post('/update', async (req, rsp, next) => {
    let data = {}
    const server = req.server
    data.mode_name = server.mode_name
    data.vm_name = server.vm_name
    data.flag = server.is_test ? (SVR_FLAG_TEST) : (server.is_gray ? SVR_FLAG_GRAY : 0)
    data.content = {}

    await m_server.update(data, { where: { name: server.name } })
    rsp.json({ err: 0 })
})

router.post('/destroy', async (req, rsp, next) => {
    post_task_server_op('destroy', req.body.name)
    rsp.json({ err: 0 })
})

router.post('/restart', async (req, rsp, next) => {
    post_task_server_op('restart', req.body.name)
    rsp.json({ err: 0 })
})

router.post('/stop', async (req, rsp, next) => {
    post_task_server_op('stop', req.body.name)
    rsp.json({ err: 0 })
})

router.post('/start', async (req, rsp, next) => {
    await post_task_server_op('start', req.body.name)
    rsp.json({ err: 0 })
})

const server = router

module.exports = server
