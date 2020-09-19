const { Router } = require('express')
const { conn, m_vm, m_server } = require('../data')
const { check_connection, copy_to_vm, clear_vm } = require('../utils/vmutils')
const { VM_FLAG_READY } = require('../flags')

let router = new Router()

router.get('/', async (req, rsp, next) => {
    var item = await m_vm.findByPk(req.body.name)
    if (item == null) {
        rsp.json({ err: 404, msg: 'vm not find' })
    }
    else {
        item.password = undefined
        item.private_key = undefined
        rsp.json({ err: 0, data: item.get() })
    }
})

async function do_sync(vm) {
    await m_vm.update({ flag: 0 }, { where: { name: vm.name } })
    await copy_to_vm(__dirname + '/../upload/vm/', vm.ip, vm.port, vm.password, vm.private_key, vm.user, vm.base_dir)
    await m_vm.update({ flag: VM_FLAG_READY }, { where: { name: vm.name } })
}

router.post('/prepare', async (req, rsp, next) => {
    var vm = await m_vm.findByPk(req.body.name)
    if (vm == null) {
        rsp.json({ err: 404, msg: 'vm not find' })
        return
    }
    do_sync(vm)
    rsp.json({ err: 0 })
})

router.post('/create', async (req, rsp, next) => {
    if (req.body.vm.password === undefined && req.body.vm.private_key === undefined) {
        rsp.json({ err: 101, msg: 'invalid param password & private key' })
        return
    }
    if (req.body.vm.base_dir.startsWith('~') || req.body.vm.base_dir.startsWith('/')) {
        rsp.json({ err: 102, msg: 'base directory invalid. Don\'t start with ~ or /' })
        return
    }
    const vm = req.body.vm
    let ok = false
    try {
        await check_connection(vm.ip, vm.port, vm.password, vm.private_key, vm.user)
        ok = true
    }
    catch (e) {
        console.log(e)
    }
    if (!ok) {
        rsp.json({ err: 0, status: 1 })
        return
    }
    req.body.vm.flag = 0

    await m_vm.create(req.body.vm)
    do_sync(vm) // async
    rsp.json({ err: 0, status: 0 })
})

router.post('/update', async (req, rsp, next) => {
    if (req.body.vm.password === undefined && req.body.vm.private_key === undefined) {
        rsp.json({ err: 101, msg: 'invalid param password & private key' })
        return
    }
    const vm = req.body.vm
    const vm2 = await m_vm.findByPk(vm.name)
    if (vm.ip !== vm2.ip) {
        rsp.json({ err: 102, msg: "can't update ip/host" })
        return
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
        if (vm.base_dir.startsWith('~') || vm.base_dir.startsWith('/')) {
            rsp.json({ err: 102, msg: 'base directory invalid. Don\'t start with ~ or /' })
            return
        }
    }

    let ok = false
    try {
        await check_connection(vm2.ip, vm2.port, vm2.password, vm2.private_key, vm2.user)
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
        v.flag = it.flag
        list.push(v)
    }
    rsp.json({ err: 0, list: list });
})

router.post('/del', async (req, rsp, next) => {
    const name = req.body.name
    if (await m_server.count({ where: { vm_name: name } }) > 0) {
        rsp.json({ err: 101, msg: 'there are servers still use this VM' })
        return
    }

    const vm2 = await m_vm.findByPk(vm.name)
    await m_vm.destroy({ where: { name: name } })
    clear_vm(vm2.ip, vm2.port, vm2.password, vm2.private_key, vm2.user)
    rsp.json({ err: 0 })
})

const vm = router
module.exports = vm