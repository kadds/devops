const { Router } = require('express')
const { conn, m_pipeline, m_mode, m_deploy, m_deploy_stream, m_server } = require('../data')
const { get_job_list, job_param_valid } = require('../plugin/index')
const { post_pipeline_op } = require('../worker/index')
const { new_ws_id } = require('../ws')
const FLAGS = require('../flags')
const { Op } = require('sequelize')

let router = new Router()

router.get('/list', async (req, rsp, next) => {
    const page = req.query.page
    const size = req.query.size
    const { count, rows } = await m_pipeline.findAndCountAll({ limit: size ? size : undefined, offset: size ? page * size : undefined, order: [['ctime', 'DESC']] })
    let list = []
    for (const item of rows) {
        let it = {}
        it.id = item.id
        it.ctime = item.ctime.valueOf()
        it.mode_name = item.mode_name
        it.stage = item.stage
        it.deploy_id = item.content.deploy_id
        list.push(it)
    }
    rsp.json({ err: 0, list: list, total: count })
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
    pipeline.stage = FLAGS.PIPE_STAGE_ENV
    pipeline.content = {}
    pipeline.content.jobs = module.content.jobs
    const param = req.body.pipeline.param
    // save param
    let save_param = []
    for (const v of pipeline.content.jobs.env) {
        if (param[v.name])
            v.param = { ...v.param, ...param[v.name] }
        save_param.push({ name: v.name, params: param[v.name] })
    }
    for (const v of pipeline.content.jobs.source) {
        if (param[v.name])
            v.param = { ...v.param, ...param[v.name] }
        save_param.push({ name: v.name, params: param[v.name] })
    }
    for (const v of pipeline.content.jobs.build) {
        if (param[v.name])
            v.param = { ...v.param, ...param[v.name] }
        save_param.push({ name: v.name, params: param[v.name] })
    }
    for (const v of pipeline.content.jobs.deploy) {
        if (param[v.name])
            v.param = { ...v.param, ...param[v.name] }
        save_param.push({ name: v.name, params: param[v.name] })
    }
    try {
        let mod = await m_mode.findByPk(req.body.pipeline.mode_name)
        mod.content.defaults = save_param
        await m_mode.update({ content: mod.content }, { where: { name: mod.name } })
    }
    catch (e) {
        console.error(e)
    }

    const res = await m_pipeline.create(pipeline)
    post_pipeline_op('run', res.id)
    rsp.json({ err: 0, id: res.id })
})

router.post('/del', async (req, rsp, next) => {
    // stop and remove current pipeline job
    const pipeline = await m_pipeline.findByPk(req.body.id)
    await post_pipeline_op('clean', req.body.id)
    if (pipeline.content.deploy_id) {
        if (await m_deploy_stream.count({
            where: {
                deploy_id: pipeline.content.deploy_id,
                status: [FLAGS.DEPLOY_STREAM_STATUS_PREPARE, FLAGS.DEPLOY_STREAM_STATUS_DOING]
            }
        }) > 0) {
            // there are some deployment plans is preparing
            rsp.json({ err: 403, msg: 'stop deployment first' })
            return
        }
        // remove all deployment plans
        await m_deploy_stream.destroy({
            where: {
                deploy_id: pipeline.content.deploy_id,
            }
        })
        // remove deployment
        await m_deploy.destroy({ where: { id: pipeline.content.deploy_id } })
    }

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
    data.stage = pipeline.stage
    data.deploy_id = pipeline.content.deploy_id
    rsp.json({ err: 0, data: data })
})

router.post('/stop', async (req, rsp, next) => {
    const pipeline = await m_pipeline.findByPk(req.body.id)
    if (!pipeline) {
        rsp.json({ err: 404, msg: 'pipeline not found' })
        return
    }
    await post_pipeline_op('stop', req.body.id)
    rsp.json({ err: 0 })
})

router.post('/log', async (req, rsp, next) => {
    const pipeline = await m_pipeline.findByPk(req.body.id)
    if (!pipeline) {
        rsp.json({ err: 404, msg: 'pipeline not found' })
        return
    }
    const id = new_ws_id(req.body.id)
    rsp.json({ err: 0, data: { id } })
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

router.get('/stat', async (req, rsp, next) => {
    const ctime = new Date()
    ctime.setHours(0, 0, 0, 0)
    ctime.setDate(ctime.getDate() - 30)

    const pipelines = await m_pipeline.findAll({ where: { ctime: { [Op.gte]: ctime.valueOf() } } })
    const map = new Map()
    for (let i = 0; i < 30; i++) {
        ctime.setDate(ctime.getDate() + 1)
        map.set(ctime.valueOf(), 0)
    }
    for (const pipe of pipelines) {
        const date = new Date(pipe.ctime)
        date.setHours(0, 0, 0, 0)
        const timestamp = date.valueOf()
        map.set(timestamp, map.get(timestamp) + 1)
    }
    const list = []
    for (const [key, v] of map.entries()) {
        list.push({ time: key, count: v })
    }
    list.sort((a, b) => (a.time < b.time))

    rsp.json({ err: 0, list })
})

const pipeline = router

module.exports = pipeline
