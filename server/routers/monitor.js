const { Router } = require('express')
let router = new Router()
const Config = require('../config')
const MongoClient = require('mongodb').MongoClient

router.post('/vm', async (req, rsp, next) => {
    const vm_name = req.body.vm_name
    const time = req.body.time
    if (vm_name) {
        const config = Config.get()
        const uri = config.mongodb.uri
        const dbName = config.mongodb.dbname
        const collection = config.mongodb.vmMonitorColumnName
        let find_obj = {
            vm: vm_name,
        }
        if (time[0]) {
            find_obj.ts = { ...find_obj.ts, $gte: time[0] }
        }
        if (time[1]) {
            find_obj.ts = { ...find_obj.ts, $lte: time[1] }
        }
        let db = null
        let list = null
        try {
            db = await MongoClient.connect(uri, { useUnifiedTopology: true })
            await db.db(dbName).collection(collection).createIndex({ ts: 1, vm: 1 })
            list = await (await db.db(dbName).collection(collection)
                .find(find_obj).toArray()).map(v => {
                    return [v.ts, ...v.dt]
                })
        }
        finally {
            db && db.close()
        }
        // test data
        rsp.json({ err: 0, data: list })
        return
    }
    throw new Error('unknown params')
})

router.post('/server', async (req, rsp, next) => {
    const server_name = req.body.server_name
    const time = req.body.time
    // server_name is an array [server1, server2, ...]
    if (server_name) {
        const config = Config.get()
        const uri = config.mongodb.uri
        const dbName = config.mongodb.dbname
        const collection = config.mongodb.serverMonitorColumnName
        let find_obj = {
            se: { $in: server_name },
        }
        if (time[0]) {
            find_obj.ts = { ...find_obj.ts, $gte: time[0] }
        }
        if (time[1]) {
            find_obj.ts = { ...find_obj.ts, $lte: time[1] }
        }
        let db = null
        let list = null
        try {
            db = await MongoClient.connect(uri, { useUnifiedTopology: true })
            await db.db(dbName).collection(collection).createIndex({ ts: 1, se: 1 })
            list = await (await db.db(dbName).collection(collection)
                .find(find_obj).toArray()).map(v => {
                    return [v.ts, ...v.dt]
                })
        }
        finally {
            db && db.close()
        }
        rsp.json({ err: 0, data: list })
        return
    }
    throw new Error('unknown params')
})

const monitor = router
module.exports = monitor