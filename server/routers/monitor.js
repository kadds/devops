const { Router } = require('express')
const { get_mongodb_vm_monitor, get_mongodb_server_monitor, get_mongodb_server_rpc, get_mongodb_click_log } = require('../utils/mogodb')

let router = new Router()

router.post('/vm', async (req, rsp, next) => {
    const vm_name = req.body.vm_name
    const time = req.body.time
    if (vm_name) {
        let find_obj = {
            vm: vm_name,
        }
        if (time[0]) {
            find_obj.ts = { ...find_obj.ts, $gte: time[0] }
        }
        if (time[1]) {
            find_obj.ts = { ...find_obj.ts, $lte: time[1] }
        }
        const cli = await get_mongodb_vm_monitor()
        await cli.createIndex({ ts: 1, vm: 1 })
        const list = (await cli.find(find_obj).toArray()).map(v => {
            return [v.ts, ...v.dt]
        })
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
        let find_obj = {
            se: { $in: server_name },
        }
        if (time[0]) {
            find_obj.ts = { ...find_obj.ts, $gte: time[0] }
        }
        if (time[1]) {
            find_obj.ts = { ...find_obj.ts, $lte: time[1] }
        }
        const cli = await get_mongodb_server_monitor()
        await cli.createIndex({ ts: 1, se: 1 })
        const list = (await cli.find(find_obj).toArray()).map(v => {
            return [v.ts, ...v.dt]
        })
        rsp.json({ err: 0, data: list })
        return
    }
    throw new Error('unknown params')
})

router.post('/call', async (req, rsp, next) => {
    const tid = req.body.tid
    const time = req.body.time
    if (tid) {
        let find_obj = {
            ti: tid,
        }
        if (time[0]) {
            find_obj.ts = { ...find_obj.ts, $gte: time[0] }
        }
        if (time[1]) {
            find_obj.ts = { ...find_obj.ts, $lte: time[1] }
        }
        let list = null
        {
            const cli = await get_mongodb_server_rpc()
            await cli.createIndex({ ts: 1, ti: 1 })
            list = (await cli.find(find_obj).toArray()).map(v => {
                return [v.ts, v.sn, v.rn, v.co, v.rc]
            })
            list.sort((a, b) => {
                return a[0] - b[0]
            })
        }
        let entry = null
        {
            const cli = await get_mongodb_click_log()
            entry = (await cli.find(find_obj).toArray()).map(v => {
                return [v.ts, v.sn, v.me + ' ' + v.ur, v.co, v.rc, v.vi]
            })
            if (entry.length === 0) {
                if (list.length === 0) {
                    rsp.json({ err: 0, list: [] })
                    return
                }
                rsp.json({ err: 109, msg: 'can\'t find entry for this call chain' })
                return
            }
        }
        let graph = []
        graph.push(entry[0])
        if (list.length > 0) {
            if (graph[0][0] > list[0][0]) {
                rsp.json({ err: 109, msg: 'call chain has invalid timestamp' })
                return
            }
        }

        rsp.json({ err: 0, list: graph })
        return
    }
    throw new Error('unknown params')
})

const monitor = router
module.exports = monitor