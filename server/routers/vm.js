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
    const vm2 = await m_vm.findByPk(vm.name)
    if (vm.ip) {
        vm2.ip = vm.ip
    }
    if (vm.port) {
        vm2.port = vm.port
    }
    if (vm.password) {
        vm2.password = vm.password
    }
    if (vm.private_key) {
        vm2.private_key = vm.private_key
    }
    if (vm.user) {
        vm2.user = vm.user
    }
    if (vm.base_dir) {
        vm2.base_dir = vm.base_dir
    }

    let ok = false
    try {
        await check_connect(vm2.ip, vm2.port, vm2.password, vm2.private_key, vm2.user)
        ok = true
    }
    catch (e) {
        console.log(e)
    }
    if (!ok) {
        rsp.json({ err: 0, status: 1 })
        return
    }

    await vm2.save()
    rsp.json({ err: 0, status: 0 })
})

router.get('/list', async (req, rsp, next) => {
    let data = await m_vm.findAll()
    let list = []
    for (let it of data) {
        let v = {}
        v.ctime = it.ctime.valueOf()
        v.name = it.name
        v.base_dir = it.base_dir
        v.ip = it.ip
        v.port = it.port
        v.user = it.user
        list.push(v)
    }
    rsp.json({ err: 0, list: list });
})

const vm = router
module.exports = vm