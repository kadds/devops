const express = require('express')
const chalk = require('chalk')
const mode = require('./routers/mode')
const pipeline = require('./routers/pipeline')
const server = require('./routers/server')
const vm = require('./routers/vm')
const user = require('./routers/user')
const log = require('./routers/log')
const comm = require('./routers/comm')
const monitor = require('./routers/monitor')
const deploy = require('./routers/deploy')
const variable = require('./routers/variable')
const { valid_token } = require('./token')
const { init } = require('./data')
const process = require('process')
const upload = require('./routers/upload')
const Worker = require('./worker/index')
const Config = require('./config')
const { listen_log } = require('./worker/pipeline')
const WebSocket = require('ws')
const url = require('url')
const { valid_ws_id } = require('./ws')
const fs = require('fs')
const port = 8077
const path = require('path')
const history = require('connect-history-api-fallback')

let static_web_pages = [path.join(__dirname + '/dist'), path.join(__dirname + '/../web/build')]

function start() {
    const app = express()
    let router = new express.Router()
    app.use('/api', router)
    router.use(express.json())
    router.use((req, rsp, next) => {
        rsp.header("Content-Type", "application/json;charset=utf-8")
        rsp.header("Access-Control-Allow-Origin", "*")
        rsp.header("Access-Control-Allow-Method", "*")
        rsp.header("Access-Control-Allow-Headers", "*")
        next()
    })
    router.use((req, rsp, next) => {
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

    router.use((err, req, rsp, next) => {
        console.log(err)
        rsp.json({ err: 500, msg: 'server error. Please retry' })
    })

    router.use('/module', mode)
    router.use('/pipeline', pipeline)
    router.use('/vm', vm)
    router.use('/server', server)
    router.use('/user', user)
    router.use('/upload', upload)
    router.use('/log', log)
    router.use('/monitor', monitor)
    router.use('/deploy', deploy)
    router.use('/comm', comm)
    router.use('/variable', variable)

    app.on('error', (val) => {
        console.log(val)
    })
    app.use('/', history({
        index: '/index.html',
    }
    ))
    for (let page of static_web_pages) {
        if (fs.existsSync(path.join(page + '/index.html'))) {
            app.use('/', express.static(page))
            break;
        }
    }
    app.listen(port)
    console.log("start listen at " + port)
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
        let bytes = 0
        ws.on('close', (code, reason) => {
            console.log(code, reason)
            const t2 = process.hrtime()
            const delta = Math.round(t2[0] * 1000 + t2[1] / 1000000 - (t[0] * 1000 + t[1] / 1000000), 1)
            const log = `> ${chalk.bold('WS')} ${req.url} ${chalk.whiteBright('closed')} ${chalk.green(delta + 'ms')} bytes ${chalk.yellow(bytes)} reason ${reason}`
            console.log(log)
        })
        const log = `> ${chalk.bold('WS')} ${req.url}`
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
            bytes += msg.length
            try {
                ws.send(msg, (err) => {
                    callback(err)
                })
            }
            catch (e) {
                console.log(e)
                callback(err)
            }
        }, () => {
            ws.close()
        })
    })
}

init().then(() => {
    Config.load().then(() => {
        start()
        start_ws()
        Worker.init_worker()
    }).catch(e => {
        console.error('Load config fail', e)
    })
})
