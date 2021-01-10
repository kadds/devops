const { Router } = require('express')
const { Op } = require('sequelize')
const { conn, m_variable } = require('../data')

let router = new Router()

router.get('/list', async (req, rsp, next) => {
    rsp.json({err: 0, list: (await m_variable.findAll()).map(v => {
        return { name: v.name, flag: v.flag, value: v.flag === 1 ? null : v.value, user: v.user }
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

router.get('/search', async (req, rsp, next) => {
    const data = await m_variable.findAll({
        where: {
            name: {
                [Op.like]: `%${req.query.key}%`
            }
        }
    })
    rsp.json({
        err: 0, list: data.map(v => {
            if (v.flag === 1) {
                return {
                    name: v.name,
                    value: null,
                    flag: 1,
                    user: v.user,
                }
            }
            else {
                return {
                    name: v.name,
                    value: v.value,
                    flag: v.flag,
                    user: v.user,
                }
            }
        })
    })
})

module.exports = router