const { Router } = require('express')
let router = new Router()

router.post('/search', async (req, rsp, next) => {
    const vid = req.body.vid
    const tid = req.body.tid
    const module_name = req.body.module_name
    const server_name = req.body.server_name
    const time_start = req.body.time_start
    const time_end = req.body.time_end
    const text = req.body.text
    const level = req.body.level
    let list = []
    rsp.json({ err: 0, list })
})


const log = router
module.exports = log