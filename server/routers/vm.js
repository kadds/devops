const { Router } = require('express')
const { conn, m_vm } = require('../data')

let router = new Router()

router.get('/', async (req, rsp, next) => {
    try {
        var item = await m_vm.findByPk(req.body.name)
        if (item == null) {
            rsp.json({})
        }
        else {
            rsp.json(item.get())
        }
    }
    catch (e) {
        console.log(e)
        rsp.json({})
        return
    }
})

router.put('/', async (req, rsp, next) => {
    try {
        await m_vm.create(req.body.vm)
    }
    catch (e) {
        console.log(e)
        return
    }
})

router.post('/', (req, rsp, next) => {
    try {
        await m_vm.update(req.body.vm)
    }
    catch (e) {
        console.log(e)
        return
    }
})

router.get('/all', (req, rsp, next) => {
    try {
        let data = await m_vm.findAll()
        rsp.json(data);
    }
    catch (e) {
        console.log(e)
        return
    }
})

const vm = router
module.exports = vm