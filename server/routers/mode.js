const { Router } = require('express')
const { conn, m_mode, m_server } = require('../data')

let router = new Router()

router.get('/list', async (req, rsp, next) => {
    const list = await m_mode.findAll()
    let data = []
    let cnt_req = []
    let idx = 0
    for (const item of list) {
        let it = {}
        it.name = item.name
        it.dev_user = item.dev_user
        it.ctime = item.ctime.valueOf()
        it.run_script = item.content.run_script
        it.compilation_script = item.content.compilation_script
        it.env_img = item.content.env_img
        it.compilation_env_img = item.content.compilation_env_img
        const name = it.name
        cnt_req.push(m_server.count({ where: { mode_name: name } }))
        idx++
        data.push(it)
    }
    const num_cnt = await Promise.all(cnt_req)
    for (let i = 0; i < num_cnt.length; i++) {
        data[i].num = num_cnt[i]
    }
    rsp.json({ err: 0, list: data })
})

// create module
router.post('/', async (req, rsp, next) => {
    let module = req.body.module
    let data = {}
    data.name = module.name
    data.flag = module.flag
    data.dev_user = module.dev_user
    data.flag = 0
    data.content = {}
    data.content.jobs = req.module.jobs

    await m_mode.create(data)
    rsp.json({ err: 0 })
})

router.post('/update', async (req, rsp, next) => {
    let module = req.body.module
    let data = {}
    data.name = module.name
    data.flag = module.flag
    data.dev_user = module.dev_user
    data.flag = 0
    data.content = {}

    await m_mode.update(data, { where: { name: module.name } })
    rsp.json({ err: 0 })
})
const mode = router

module.exports = mode
