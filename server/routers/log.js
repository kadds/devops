const { Router } = require('express')
const { m_server } = require('../data')
const { get_mongodb_log, get_mongodb_click_log } = require('../utils/mogodb')
const { tid2text, text2tid } = require('../utils/tid')
const Long = require('mongodb').Long

let router = new Router()

router.post('/search', async (req, rsp, next) => {
    const vid = req.body.vid
    const tid = req.body.tid
    const module_name = req.body.module
    const server_name = req.body.server
    const time_start = req.body.time_start
    const time_end = req.body.time_end
    const text = req.body.detail
    const level = req.body.level
    const page = req.body.page || 0
    const size = req.body.size || 100
    let find_obj = {}
    if (vid !== undefined && vid !== null) {
        find_obj.vi = vid
    }
    if (tid) {
        find_obj.ti = Long.fromString(text2tid(tid.trim()))
    }
    if (server_name) {
        find_obj.sn = server_name
    }
    else if (module_name) {
        find_obj.sn = { $in: (await m_server.findAll({ where: { mode_name: module_name } })).map(v => { return v.name }) }
    }

    if (level) {
        if (Array.isArray(level)) {
            find_obj.le = { $in: level }
        }
        else {
            find_obj.le = level
        }
    }

    if (time_start || time_end) {
        find_obj.ts = {}
        if (time_start)
            find_obj.ts.$gte = new Date(time_start)
        if (time_end)
            find_obj.ts.$lte = new Date(time_end)
    }
    if (text) {
        find_obj.$text = { $search: text }
    }
    console.log(find_obj)

    const cli = await get_mongodb_log()
    const list = (await cli.find(find_obj).skip(page * size).limit(size).toArray()).map(v => {
        return [v._id, v.vi, new Date(v.ts).valueOf(), tid2text(v.ti), v.sn, v.le, v.lo]
    })
    const count = await cli.find(find_obj).count()
    rsp.json({ err: 0, list, total: count })
})

router.post('/click/search', async (req, rsp, next) => {
    const vid = req.body.vid
    const time_start = req.body.time_start
    const time_end = req.body.time_end
    const page = req.body.page || 0
    const size = req.body.size || 100
    let find_obj = {}
    if (vid !== undefined && vid !== null) {
        find_obj.vi = vid
    }
    if (time_start || time_end) {
        find_obj.ts = {}
        if (time_start)
            find_obj.ts.$gte = new Date(time_start)
        if (time_end)
            find_obj.ts.$lte = new Date(time_end)
    }
    console.log(find_obj)
    const cli = await get_mongodb_click_log()
    const list = (await cli.find(find_obj).skip(page * size).limit(size).toArray()).map(v => {
        return [v._id, v.vi, new Date(v.ts).valueOf(), tid2text(v.ti), v.sn, v.co, v.me, v.ur, v.ho, v.rc, v.rl]
    })
    const count = await cli.find(find_obj).count()
    rsp.json({ err: 0, list, total: count })
})

const log = router
module.exports = log