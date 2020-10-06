const { Router } = require('express')
const { conn, m_user } = require('../data')
const { create_token, delete_token } = require('../token')

let router = new Router()

router.get('/', async (req, rsp, next) => {
    let user = null
    if (req.query.username === undefined || req.query.username == '') {
        // current user
        user = req.user.data.username
    }
    else {
        user = req.query.username
    }

    let item = await m_user.findByPk(user)
    if (item === null) {
        rsp.json({ err: 400, msg: 'user not find' })
    }
    else {
        let user = {}
        user.username = item.username
        user.ctime = item.ctime.valueOf()
        user.last_login_time = item.content.last_login_time || null
        user.last_login_ip = item.content.last_login_ip || ''
        user.nick = item.content.nick || user.username
        user.mark = item.content.mark || ''

        rsp.json({ err: 0, data: user })
    }
})

router.post('/register', async (req, rsp, next) => {
    await m_user.create(req.body.user)
    rsp.json({ err: 0 })
})

router.post('/login', async (req, rsp, next) => {
    const item = await m_user.findByPk(req.body.username, { where: { password: req.body.password } })
    if (item === null) {
        rsp.json({ err: 201, msg: 'password error' })
    }
    else {
        item.content.last_login_time = new Date().valueOf()
        item.content.last_login_ip = req.ip

        await m_user.update({ content: item.content }, { where: { username: item.username } })
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
        list.push(dt)
    }
    rsp.json({ err: 0, list })
})

const user = router
module.exports = user