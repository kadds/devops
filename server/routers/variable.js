const { Router } = require('express')
const { conn, m_variable } = require('../data')

let router = new Router()

router.get('/list', async (req, rsp, next) => {
    rsp.json({err: 0, list: (await m_variable.findAll()).map(v => {
        return {name: v.name, flag: v.flag, value: v.flag === 1 ? null : v.value}
    })})
})

router.post('/set', async (req, rsp, next) => {
    let obj = {}
    obj.name = req.body.name
    obj.value = req.body.value
    obj.flag = req.body.flag === 1 ? 1 : 0
    obj.user = req.user.data.username
    await m_variable.create(obj)
    rsp.json({err: 0})
})

router.post('/del', async (req, rsp, next) => {
    await m_variable.destroy({where: {name: req.body.name}})
    rsp.json({err: 0})
})

module.exports = router