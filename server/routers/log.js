const { Router } = require('express')
const MongoClient = require('mongodb').MongoClient
const { m_server } = require('../data')
const Config = require('../config')

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
        find_obj.ti = tid
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
            find_obj.ts.$gte = time_start
        if (time_end)
            find_obj.ts.$lte = time_end
    }
    if (text) {
        find_obj.$text = { $search: text }
    }
    console.log(find_obj)

    const config = Config.get()

    const uri = config.mongodb.uri
    const dbName = config.mongodb.dbname
    const collection = config.mongodb.logColumnName
    const db = await MongoClient.connect(uri, { useUnifiedTopology: true })
    await db.db(dbName).collection(collection).createIndex({ lo: "text", ts: 1 })

    let list = await db.db(dbName).collection(collection).find(find_obj).skip(page * size).limit(size).toArray()
    const count = await db.db(dbName).collection(collection).find(find_obj).count()
    list = list.map(v => { return [v._id, v.vi, v.ts, v.ti, v.sn, v.le, v.lo] })

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
            find_obj.ts.$gte = time_start
        if (time_end)
            find_obj.ts.$lte = time_end
    }
    console.log(find_obj)

    const config = Config.get()
    const uri = config.mongodb.uri
    const dbName = config.mongodb.dbname
    const collection = config.mongodb.clickLogColumnName
    const db = await MongoClient.connect(uri, { useUnifiedTopology: true })
    await db.db(dbName).collection(collection).createIndex({ vi: 1, ts: 1 })

    let list = await db.db(dbName).collection(collection).find(find_obj).skip(page * size).limit(size).toArray()
    const count = await db.db(dbName).collection(collection).find(find_obj).count()
    list = list.map(v => { return [v._id, v.vi, v.ts, v.ti, v.sn, v.co, v.me, v.ur, v.ho, v.rc, v.rl] })

    rsp.json({ err: 0, list, total: count })
})

const log = router
module.exports = log