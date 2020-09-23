const express = require('express')
const chalk = require('chalk')
const mode = require('./routers/mode')
const pipeline = require('./routers/pipeline')
const server = require('./routers/server')
const vm = require('./routers/vm')
const user = require('./routers/user')
const log = require('./routers/log')
const monitor = require('./routers/monitor')
const { valid_token } = require('./token')
const { init } = require('./data')
const process = require('process')
const upload = require('./routers/upload')
const { } = require('./worker/index')
const { listen_log } = require('./worker/pipeline')
const WebSocket = require('ws')
const { Server } = require('ws-promise')
const url = require('url')
const { valid_ws_id } = require('./ws')


function start() {
    const app = express()
    app.on('error', (val) => {
        console.log(val)
    })

    app.use(express.json())
    app.use('/', (req, rsp, next) => {
        rsp.header("Content-Type", "application/json;charset=utf-8")
        rsp.header("Access-Control-Allow-Origin", "*")
        rsp.header("Access-Control-Allow-Method", "*")
        rsp.header("Access-Control-Allow-Headers", "*")
        next()
    })
    app.use('/', (req, rsp, next) => {
        if (req.method === "OPTIONS") {
            return next()
        }
        const t = process.hrtime()
        rsp.on('finish', () => {
            const t2 = process.hrtime()
            const delta = Math.round(t2[0] * 1000 + t2[1] / 1000000 - (t[0] * 1000 + t[1] / 1000000), 1)
            const log = `> ${chalk.bold(req.method)} ${req.originalUrl} ${chalk.green(delta + 'ms')}`
            console.log(log)
        })
        if (req.path === '/user/login') {
            next()
        }
        else {
            let token = req.get('token')
            const tokendata = valid_token(token)
            if (tokendata === null) {
                rsp.json({ err: 401, msg: 'login please' })
            }
            else {
                req.user = tokendata
                next()
            }
        }
    })

    app.use((err, req, rsp, next) => {
        console.log(err)
        rsp.json({ err: 500, msg: 'server error. Please retry' })
    })

    app.use('/module', mode)
    app.use('/pipeline', pipeline)
    app.use('/vm', vm)
    app.use('/server', server)
    app.use('/user', user)
    app.use('/upload', upload)
    app.use('/log', log)
    app.use('/monitor', monitor)

    app.listen(8077)
    console.log("start listen")
}

function start_ws() {
    const wss = new WebSocket.Server({
        port: 8078,
        perMessageDeflate: {
            zlibDeflateOptions: {
                chunkSize: 1024,
                memLevel: 7,
                level: 3
            },
            zlibInflateOptions: {
                chunkSize: 10 * 1024
            },
            clientNoContextTakeover: true,
            serverNoContextTakeover: true,
            serverMaxWindowBits: 10,
            concurrencyLimit: 10,
            threshold: 1024
        }
    });
    wss.on('connection', (ws, req) => {
        const t = process.hrtime()
        ws.on('close', () => {
            const t2 = process.hrtime()
            const delta = Math.round(t2[0] * 1000 + t2[1] / 1000000 - (t[0] * 1000 + t[1] / 1000000), 1)
            const log = `> ${chalk.bold('ws')} ${req.url} ${chalk.whiteBright('closed')} ${chalk.green(delta + 'ms')}`
            console.log(log)
        })
        const log = `> ${chalk.bold('ws')} ${req.url}`
        console.log(log)
        const URI = new url.URL('ws://' + req.headers.host + req.url)
        const id = URI.searchParams.get('id')
        const pipeline_id = valid_ws_id(id)
        if (pipeline_id === null) {
            console.log('error connect ws id')
            ws.close()
            return
        }
        listen_log(pipeline_id, (msg, callback) => {
            ws.send(msg, (err) => {
                callback(err)
            })
        }, () => {
            ws.close()
        })
    })
}

init().then(() => {
    start()
    start_ws()
})
