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
    if (vid) {
        find_obj.vid = vid
    }
    if (tid) {
        find_obj.tid = tid
    }
    if (server_name) {
        find_obj.server = server_name
    }
    else if (module_name) {
        find_obj.server = { $in: (await m_server.findAll({ where: { mode_name: module_name } })).map(v => { return v.name }) }
    }

    if (level) {
        if (Array.isArray(level)) {
            find_obj.level = { $in: level }
        }
        else {
            find_obj.level = level
        }
    }

    if (time_start || time_end) {
        find_obj.timestamp = {}
        if (time_start)
            find_obj.timestamp.$gte = time_start
        if (time_end)
            find_obj.timestamp.$lte = time_end
    }
    if (text) {
        find_obj.$text = { $search: text }
    }
    console.log(find_obj)

    let list = []
    const config = Config.get()

    const uri = config.mongodb.uri
    const dbName = config.mongodb.dbname
    const collection = config.mongodb.logColumnName
    const db = await MongoClient.connect(uri, { useUnifiedTopology: true })
    await db.db(dbName).collection(collection).createIndex({ detail: "text" })
    await db.db(dbName).collection(collection).createIndex({ _id: 1 })
    list = await db.db(dbName).collection(collection).find(find_obj).skip(page * size).limit(size).toArray()
    const count = await db.db(dbName).collection(collection).find(find_obj).count()

    rsp.json({ err: 0, list, count })
})

router.post('/click/search', async (req, rsp, next) => {
    // TODO: do search in mongodb
    const list = []
    let count = 0
    rsp.json({ err: 0, list, count })
})

const log = router
module.exports = log