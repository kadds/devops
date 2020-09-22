const { Router } = require('express')
const { conn, m_pipeline, m_mode } = require('../data')
const { get_job_list, job_param_valid } = require('../plugin/index')
const { post_pipeline_op } = require('../worker/index')

let router = new Router()

router.get('/list', async (req, rsp, next) => {
    const offset = req.query.off | 0
    const size = req.query.size | 10
    const list = await m_pipeline.findAll({ limit: size, offset, order: [['ctime', 'DESC']] })
    let ls = []
    for (const item of list) {
        let it = {}
        it.id = item.id
        it.ctime = item.ctime.valueOf()
        it.mode_name = item.mode_name
        it.stage = item.stage
        ls.push(it)
    }
    rsp.json({ err: 0, list: ls })
})

router.post('/op', (req, rsp, next) => {
    // update pipeline next stage
})

router.post('/', async (req, rsp, next) => {
    // new pipeline
    let module = null
    if (!req.body.pipeline.mode_name || (module = await (m_mode.findByPk(req.body.pipeline.mode_name))) === undefined) {
        rsp.json({ err: 404, msg: 'module name not find' })
        return
    }
    let pipeline = {}
    pipeline.mark = req.body.pipeline.mark
    pipeline.mode_name = req.body.pipeline.mode_name
    pipeline.stage = 0
    pipeline.content = {}
    pipeline.content.jobs = module.content.jobs
    const id = await m_pipeline.create(pipeline).id
    post_pipeline_op('run', id)
    rsp.json({ err: 0 })
})

router.post('/del', async (req, rsp, next) => {
    await m_pipeline.destroy({ where: { id: req.body.id } })
    rsp.json({ err: 0 })
})

router.get('', async (req, rsp, next) => {
    const id = req.query.id
    const pipeline = await m_pipeline.findByPk(id)
    let data = {}
    data.id = pipeline.id
    data.mark = pipeline.mark
    data.mode_name = pipeline.mode_name
    data.content = pipeline.content
    data.ctime = pipeline.ctime.valueOf()
    data.mtime = pipeline.mtime.valueOf()
    data.stage = pipeline.stage
    rsp.json({ err: 0, data: data })
})

router.get('/jobs', async (req, rsp, next) => {
    let list = []
    let map = {}
    const job_list = get_job_list()
    for (const job of job_list) {
        if (map[job.type] === undefined) {
            map[job.type] = []
        }
        map[job.type].push(job)
    }
    list = Object.entries(map).map(([idx, job]) => { return { type: idx, job } })

    rsp.json({ err: 0, list })
})

router.post('/jobs/valid', async (req, rsp, next) => {
    const res = await job_param_valid(req.body.job.name, req.body.job.param)
    if (res === '' || res === null) {
        rsp.json({ err: 0, data: '' })
    }
    else {
        rsp.json({ err: 0, data: res })
    }
})

const pipeline = router

module.exports = pipeline
