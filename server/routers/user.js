const { Router } = require('express')
const { conn, m_user } = require('../data')
const { create_token, delete_token } = require('../token')
const crypto = require('crypto')

let router = new Router()

function make_salt() {
    let text = ""
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789*.%=@!~`^&()-[]{}|\\/?<>;'"

    const len = Math.floor(Math.random() * 4) + 15;

    for (var i = 0; i < len; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length))

    return text
}

function crypto_password(password, salt) {
    if (salt === undefined || salt === null) {
        return password
    }
    const v = password + salt
    const md5 = crypto.createHash('md5')
    const ret = md5.update(v).digest('hex')
    return ret
}

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

router.post('/login', async (req, rsp, next) => {
    const item = await m_user.findByPk(req.body.username)
    if (item === null) {
        rsp.json({ err: 201, msg: 'user not find' })
    }
    else {
        if (crypto_password(req.body.password, item.content.salt) !== item.password) {
            rsp.json({ err: 201, msg: 'password error' })
            return
        }
        item.content.last_login_time = new Date().valueOf()
        item.content.last_login_ip = req.ip

        await m_user.update({ content: item.content }, { where: { username: item.username } })
        let user = {}
        user.username = item.username
        user.ctime = item.ctime.valueOf()
        user.last_login_time = item.content.last_login_time || null
        user.last_login_ip = item.content.last_login_ip || ''
        user.nick = item.content.nick || user.username
        user.mark = item.content.mark || ''
        rsp.json({ err: 0, token: create_token({ username: req.body.username }), data: user })
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
        dt.mark = it.content.mark
        list.push(dt)
    }
    rsp.json({ err: 0, list })
})

router.post('/add', async (req, rsp, next) => {
    const user = req.body.user
    user.content = {}
    user.content.salt = make_salt()
    user.password = crypto_password(user.password, user.content.salt)
    if (req.user.data.username !== 'admin') {
        rsp.json({ err: 501, msg: 'unauthorized' })
        return
    }
    await m_user.create(user)
    rsp.json({ err: 0 })
})

router.post('/rm', async (req, rsp, next) => {
    const user = req.body.user
    if (req.user.data.username !== 'admin') {
        rsp.json({ err: 501, msg: 'unauthorized' })
        return
    }
    await m_user.destroy({ where: { username: user } })
    rsp.json({ err: 0 })
})

router.post('/password', async (req, rsp, next) => {
    let username = req.body.user.username
    const pwd = req.body.user.password
    if (username === null) {
        username = req.user.data.username
    }
    if (username !== req.user.data.username) {
        if (req.user.data.username !== 'admin') {
            rsp.json({ err: 501, msg: 'unauthorized' })
            return
        }
    }
    const user = await m_user.findByPk(username)
    if (user.content.salt === undefined || user.content.salt === null) {
        user.content.salt = make_salt()
    }
    const password = crypto_password(pwd, user.content.salt)
    await m_user.update({ password: password, content: user.content }, { where: { username: user.username } })
    rsp.json({ err: 0 })
})

router.post('/mark', async (req, rsp, next) => {
    const mark = req.body.mark
    const username = req.user.data.username
    const content = (await m_user.findByPk(username)).content
    content.mark = mark
    await m_user.update({ content }, { where: { username: username } })
    rsp.json({ err: 0 })
})

const user = router
module.exports = user