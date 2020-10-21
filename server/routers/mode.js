const { Router } = require('express')
const { conn, m_mode, m_server, m_pipeline } = require('../data')
const { get_job_pipeline_params } = require('../plugin/index')
const { post_clean_task } = require('../worker/index')

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

async function fill_params(name, map) {
    let param = await get_job_pipeline_params(name)
    const kv = map.get(name)
    let new_param = []
    for (let p of param) {
        let item = Object.assign({}, p)
        if (kv) {
            item.default = kv.get(item.name)
        }
        new_param.push(item)
    }
    return new_param
}

router.get('', async (req, rsp, next) => {
    const name = req.query.name
    const data = await m_mode.findByPk(name)
    if (!data) {
        rsp.json({ err: 404, msg: 'not find module name ' + name })
        return
    }
    let dt = {}
    dt.name = data.name
    dt.dev_user = data.dev_user
    dt.ctime = data.ctime.valueOf()
    dt.jobs = data.content.jobs
    dt.pipeline_params = { env: [], source: [], build: [], deploy: [] }
    let map = new Map()
    // [{name: name, params: {}}]
    console.log(data.content.defaults)
    if (data.content.defaults) {
        for (const def of data.content.defaults) {
            let list = map.get(def.name) || new Map()
            if (def.params) {
                for (const [k, v] of Object.entries(def.params)) {
                    list.set(k, v)
                }
                map.set(def.name, list)
            }
        }
    }
    for (const { name } of dt.jobs.env) {
        dt.pipeline_params.env.push({ name, param: await fill_params(name, map) })
    }
    for (const { name } of dt.jobs.source) {
        dt.pipeline_params.source.push({ name, param: await fill_params(name, map) })
    }
    for (const { name } of dt.jobs.build) {
        dt.pipeline_params.build.push({ name, param: await fill_params(name, map) })
    }
    for (const { name } of dt.jobs.deploy) {
        dt.pipeline_params.deploy.push({ name, param: await fill_params(name, map) })
    }
    rsp.json({ err: 0, data: dt })
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
    data.content.jobs = module.jobs

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

    await m_mode.update(data, { where: { name: module.name } })
    rsp.json({ err: 0 })
})

router.post('/del', async (req, rsp, next) => {
    const name = req.body.name
    if (await m_server.count({ where: { mode_name: name } }) > 0) {
        rsp.json({ err: 101, msg: 'there are servers still under module ' + name + '.' })
        return
    }
    await m_mode.destroy({ where: { name: name } })
    // remote cache
    post_clean_task({ vm_name: null, module_name: name })
    rsp.json({ err: 0 })
})

const mode = router

module.exports = mode
