const { Router } = require('express')
const { m_script } = require('../data')

let router = new Router()

router.post('/script', async (req, rsp, next) => {
    const name = req.body.name
    if (name === undefined || name === null || name.indexOf('/') >= 0) {
        jsp.json({ err: 512, msg: 'invalid script name ' + name })
        return
    }
    const content = req.body.data
    if ((await m_script.findByPk(name, { attributes: ['name'] }))) {
        await m_script.update({ content: content }, { where: { name } })
    } else {
        await m_script.create({ name, content, tags: [] })
    }
    rsp.json({ err: 0 })
})

router.get('/list', async (req, rsp, next) => {
    const list = await m_script.findAll({ attributes: ['name', 'tags'] })
    rsp.json({ err: 0, list: list.map(v => { return v.name }) })
})

router.get('/', async (req, rsp, next) => {
    const name = req.query.name
    if (name === undefined || name === null || name.indexOf('/') >= 0) {
        rsp.json({ err: 512, msg: 'invalid script name ' + name })
        return
    }
    const data = await m_script.findByPk(name)
    rsp.json({ err: 0, data: data.content })
})

router.post('/del', async (req, rsp, next) => {
    const name = req.body.name
    if (name === undefined || name === null || name.indexOf('/') >= 0) {
        rsp.json({ err: 512, msg: 'invalid script name ' + name })
        return
    }
    await m_script.destroy({ where: { name } })
    rsp.json({ err: 0 })
})

const upload = router

module.exports = upload
