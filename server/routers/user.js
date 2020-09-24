const { Router } = require('express')
const { conn, m_user } = require('../data')
const { create_token, delete_token } = require('../token')

let router = new Router()

router.get('/', async (req, rsp, next) => {
    if (req.params.username === undefined || req.params.username == '') {
        // current user
        req.params.username = req.user.data.username
    }

    let item = await m_user.findByPk(req.params.username)
    if (item === null) {
        rsp.json({ err: 400, msg: 'user not find' })
    }
    else {
        item.password = undefined
        item.ctime = item.ctime.valueOf()
        item.mtime = undefined
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

router.get('/list', async (req, rsp, next) => {
    const data = await m_user.findAll()
    let list = []
    for (const it of data) {
        let dt = {}
        dt.username = it.username
        dt.avatar = it.avatar
        dt.ctime = it.ctime.valueOf()
        list.push(dt)
    }
    rsp.json({ err: 0, list })
})

const user = router
module.exports = user