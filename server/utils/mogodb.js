const Config = require('../config')
const MongoClient = require('mongodb').MongoClient


let db = null
let cli = null
let is_try_connect = false
let time_out = 5000
let time_out_id = null
let promise_list = []

function connect_timeout() {
    if (db) {
        console.log('mongodb connection is closing because of timeout')
        cli.close()
        cli = null
        db = null
    }
}

async function connect() {
    const config = Config.get()
    const uri = config.mongodb.uri
    const dbName = config.mongodb.dbname
    const client = await MongoClient.connect(uri, { useUnifiedTopology: true })
    db = client.db(dbName)
    cli = client
    console.log('mongodb is connecting')
}

async function get_mongodb() {
    if (db === null) {
        if (!is_try_connect) {
            is_try_connect = true
            try {
                await connect()
            }
            finally {
                is_try_connect = false
                for (const res of promise_list) {
                    res()
                }
                promise_list = []
            }
        }
        else {
            await new Promise((res) => {
                promise_list.push(res)
            })
        }
    }
    if (db === null) {
        throw 'connect to mongodb fail'
    }
    if (time_out_id) {
        clearTimeout(time_out_id)
    }
    time_out_id = setTimeout(connect_timeout, time_out)
    return db
}

async function get_mongodb_vm_monitor() {
    const config = Config.get()
    const collection = config.mongodb.vmMonitorColumnName
    const col = (await get_mongodb()).collection(collection)
    const create_index = async () => {
        await Promise.allSettled([
            col.createIndex({ ts: 1 }, { expireAfterSeconds: config.mongodb.vmMonitorTTL, background: true }),
            col.createIndex({ vm: 1 }, { background: true })
        ])
    }
    create_index()

    return col
}

async function get_mongodb_server_monitor() {
    const config = Config.get()
    const collection = config.mongodb.serverMonitorColumnName
    const col = (await get_mongodb()).collection(collection)
    const create_index = async () => {
        await Promise.allSettled([
            col.createIndex({ ts: 1 }, { expireAfterSeconds: config.mongodb.serverMonitorTTL, background: true }),
            col.createIndex({ sn: 1 }, { background: true })
        ])
    }
    create_index()

    return col
}

async function get_mongodb_log() {
    const config = Config.get()
    const collection = config.mongodb.logColumnName
    const col = (await get_mongodb()).collection(collection)
    const create_index = async () => {
        await Promise.allSettled([
            col.createIndex({ ts: 1 }, { expireAfterSeconds: config.mongodb.logTTL, background: true }),
            col.createIndex({ vi: 1 }, { background: true }),
            col.createIndex({ lo: "text" }, { background: true })
        ])
    }
    create_index()

    return col
}

async function get_mongodb_click_log() {
    const config = Config.get()
    const collection = config.mongodb.clickLogColumnName
    const col = (await get_mongodb()).collection(collection)
    const create_index = async () => {
        await Promise.allSettled([
            col.createIndex({ ts: 1 }, { expireAfterSeconds: config.mongodb.clickLogTTL, background: true }),
            col.createIndex({ vi: 1 }, { background: true }),
        ])
    }
    create_index()

    return col
}

async function get_mongodb_server_rpc() {
    const config = Config.get()
    const collection = config.mongodb.serverRpcStatisticsColumnName
    const col = (await get_mongodb()).collection(collection)
    const create_index = async () => {
        await Promise.allSettled([
            col.createIndex({ ts: 1 }, { expireAfterSeconds: config.mongodb.serverRpcStatisticsTTL, background: true }),
            col.createIndex({ co: 1 }, { background: true }),
            col.createIndex({ ti: 1 }, { background: true }),
        ])
    }
    create_index()

    return col
}

module.exports = { get_mongodb, get_mongodb_vm_monitor, get_mongodb_server_monitor, get_mongodb_log, get_mongodb_click_log, get_mongodb_server_rpc }
