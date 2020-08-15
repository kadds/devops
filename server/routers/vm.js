const { Router } = require('express')
const { conn, m_vm } = require('../data')
const { check_connect } = require('../utls/vmutls')

let router = new Router()

router.get('/', async (req, rsp, next) => {
    var item = await m_vm.findByPk(req.body.name)
    if (item == null) {
        rsp.json({ err: 404, msg: 'vm not find' })
    }
    else {
        rsp.json({ err: 0, data: item.get() })
    }
})

router.post('/create', async (req, rsp, next) => {
    if (req.body.vm.password === undefined && req.body.vm.private_key === undefined) {
        rsp.json({ err: 101, msg: 'invalid param password & private key' })
    }
    const vm = req.body.vm
    let ok = false
    try {
        await check_connect(vm.ip, vm.port, vm.password, vm.private_key, vm.user)
        ok = true
    }
    catch (e) {
        console.log(e)
    }
    if (!ok) {
        rsp.json({ err: 0, status: 1 })
        return
    }

    await m_vm.create(req.body.vm)
    rsp.json({ err: 0, status: 0 })
})

router.post('/update', async (req, rsp, next) => {
    if (req.body.vm.password === undefined && req.body.vm.private_key === undefined) {
        rsp.json({ err: 101, msg: 'invalid param password & private key' })
    }
    const vm = req.body.vm
    let ok = false
    try {
        await check_connect(vm.ip, vm.port, vm.password, vm.private_key, vm.user)
        ok = true
    }
    catch (e) {
    }
    if (!ok) {
        rsp.json({ err: 0, status: 1 })
    }

    await m_vm.update(req.body.vm)
    rsp.json({ err: 0, status: 0 })
})

router.get('/list', async (req, rsp, next) => {
    let data = await m_vm.findAll()
    rsp.json({ err: 0, list: data });
})

const vm = router
module.exports = vm