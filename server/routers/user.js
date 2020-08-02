const { Router } = require('express')
const { conn, m_user } = require('../data')
const { create_token, delete_token } = require('../token')

let router = new Router()

router.get('/', async (req, rsp, next) => {
    if (req.body.username === undefined || req.body.username == '') {
        rsp.json({ err: 402, msg: 'empty user' })
        return
    }
    let item = await m_user.findByPk(req.body.username)
    if (item === null) {
        rsp.json({ err: 400, msg: 'user not find' })
    }
    else {
        item.password = ''
        rsp.json({ err: 0, data: item.get() })
    }
})

router.post('/register', async (req, rsp, next) => {
    await m_user.create(req.body.user)
    rsp.json({ err: 0 })
})

router.post('/login', async (req, rsp, next) => {
    const item = await m_user.findByPk(req.body.username)
    if (item === null) {
        rsp.json({ err: 201, msg: 'password error' })
    }
    else {
        rsp.json({ err: 0, token: create_token({ username: req.body.username }) })
    }
})

router.post('/logout', async (req, rsp, next) => {
    delete_token(req.get('token'))
})

router.get('/all', async (req, rsp, next) => {
    const data = await m_user.findAll()
    rsp.json({ err: 0, data: data.get() })
})

const user = router
module.exports = user