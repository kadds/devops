const { Router } = require('express')
let router = new Router()
const Config = require('../config')
const MongoClient = require('mongodb').MongoClient

router.get('/vm', async (req, rsp, next) => {
    const vm_name = req.query.name
    if (vm_name) {
        const config = Config.get()
        const uri = config.mongodb.uri
        const dbName = config.mongodb.dbname
        const collection = config.mongodb.vmMonitorColumnName
        const db = await MongoClient.connect(uri, { useUnifiedTopology: true })
        let find_obj = {
            vm: vm_name,
            ts: { $gte: 0 }
        }
        await db.db(dbName).collection(collection).createIndex({ ts: 1, vm: 1 })
        const list = await (await db.db(dbName).collection(collection)
            .find(find_obj).toArray()).map(v => {
                return [v.ts, ...v.dt]
            })
        // test data
        rsp.json({ err: 0, data: list })
        return
    }
    throw new Error('unknown params')
})

const monitor = router
module.exports = monitor