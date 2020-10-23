const { Router } = require('express')
const { get_mongodb_vm_monitor, get_mongodb_server_monitor, get_mongodb_server_rpc, get_mongodb_click_log } = require('../utils/mogodb')
const { tid2text, text2tid } = require('../utils/tid')
const Long = require('mongodb').Long

let router = new Router()

router.post('/vm', async (req, rsp, next) => {
    const vm_name = req.body.vm_name
    const time = req.body.time
    if (vm_name) {
        let find_obj = {
            vm: vm_name,
        }
        if (time[0]) {
            find_obj.ts = { ...find_obj.ts, $gte: new Date(time[0]) }
        }
        if (time[1]) {
            find_obj.ts = { ...find_obj.ts, $lte: new Date(time[1]) }
        }
        const cli = await get_mongodb_vm_monitor()
        const list = (await cli.find(find_obj).toArray()).map(v => {
            return [new Date(v.ts).valueOf(), ...v.d]
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
            sn: { $in: server_name },
        }
        if (time[0]) {
            find_obj.ts = { ...find_obj.ts, $gte: new Date(time[0]) }
        }
        if (time[1]) {
            find_obj.ts = { ...find_obj.ts, $lte: new Date(time[1]) }
        }
        const cli = await get_mongodb_server_monitor()
        let last_ts = 0
        let last_restart_count = 0
        const list = (await cli.find(find_obj).toArray()).map(v => {
            let rc = 0
            if (v.st > last_ts) {
                rc = v.rc
                last_restart_count = v.rc
            }
            else {
                rc = v.rc - last_restart_count
                last_restart_count = v.rc
            }
            return [new Date(v.ts).valueOf(), v.cp, v.mm, v.vm, v.tc, rc]
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
            ti: Long.fromString(text2tid(tid.trim())),
        }
        if (time[0]) {
            find_obj.ts = { ...find_obj.ts, $gte: new Date(time[0]) }
        }
        if (time[1]) {
            find_obj.ts = { ...find_obj.ts, $lte: new Date(time[1]) }
        }
        let list = null
        {
            const cli = await get_mongodb_server_rpc()
            list = (await cli.find(find_obj).toArray()).map(v => {
                return [new Date(v.ts).valueOf(), v.sn, v.rn, v.co, v.rc, v.ni, v.pn]
            })
            list.sort((a, b) => {
                return a[0] - b[0]
            })
        }
        let entry = null
        {
            const cli = await get_mongodb_click_log()
            entry = (await cli.find(find_obj).toArray()).map(v => {
                return [new Date(v.ts).valueOf(), v.sn, v.me + ' ' + v.ur, v.co, v.rc, v.ni, v.vi]
            })
        }

        rsp.json({ err: 0, list, entry })
        return
    }
    throw new Error('unknown params')
})

router.post('/rpc', async (req, rsp, next) => {
    const servers = req.body.server_name
    const time = req.body.time
    let find_obj = {
        sn: { $in: servers },
    }
    if (time[0]) {
        find_obj.ts = { ...find_obj.ts, $gte: new Date(time[0]) }
    }
    if (time[1]) {
        find_obj.ts = { ...find_obj.ts, $lte: new Date(time[1]) }
    }
    const cli = await get_mongodb_server_rpc()
    // TODO: query error count
    const fns = await cli.aggregate([
        {
            $match: find_obj,
        },
        {
            $project: { fn: 1 },
        },
        {
            $group: { _id: '$fn', count: { $sum: 1 } }
        }
    ]).toArray()
    let list = fns.map(v => { return { name: v._id, count: v.count } })
    rsp.json({ err: 0, list })
})

router.post('/rpc/cost', async (req, rsp, next) => {
    const servers = req.body.server_name
    const time = req.body.time
    // TODO: query P50
})

const monitor = router
module.exports = monitor