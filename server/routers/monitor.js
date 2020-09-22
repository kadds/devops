const { Router } = require('express')
let router = new Router()

router.get('/', async (req, rsp, next) => {
    const vm_name = req.query.vm
    const server_name = req.query.server
    const module_name = req.query.module
})

const monitor = router
module.exports = monitor