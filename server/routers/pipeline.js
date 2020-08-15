const { Router } = require('express')
const { conn, m_pipeline } = require('../data')

let router = new Router()

router.get('/list', async (req, rsp, next) => {
    const offset = req.params.off
    const size = req.params.size
    const list = await m_pipeline.findAll({})
    rsp.json({ err: 0, data: list })
})

router.post('/op', (req, rsp, next) => {
    // update pipeline
})

router.post('/', (req, rsp, next) => {
    // new pipeline

})

router.get('/all', (req, rsp, next) => {

})

const pipeline = router

module.exports = pipeline
