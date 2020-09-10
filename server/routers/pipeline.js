const { Router } = require('express')
const { conn, m_pipeline } = require('../data')
const { get_job_list, job_param_valid } = require('../plugin/index')

let router = new Router()

router.get('/list', async (req, rsp, next) => {
    const offset = req.params.off
    const size = req.params.size
    const list = await m_pipeline.findAll({})
    rsp.json({ err: 0, list })
})

router.post('/op', (req, rsp, next) => {
    // update pipeline
})

router.post('/', (req, rsp, next) => {
    // new pipeline

})

router.get('/all', (req, rsp, next) => {

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
