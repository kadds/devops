const { Router } = require('express')
const { m_deploy } = require('../data')

let router = new Router()

router.get('', async (req, rsp, next) => {
    const page = req.query.page
    const size = req.query.size
    const data = await m_deploy.findAll()
    let list = []
    for (const it of data) {
        let item = {}
        item.id = it.id
        item.module = it.module
        item.pipeline_id = it.pipeline_id
        item.status = it.status
        item.test_server = it.content.test_server
        item.do_count = it.content.do_count
    }

    rsp.json({ err: 0, list })
})



const deploy = router
module.exports = deploy