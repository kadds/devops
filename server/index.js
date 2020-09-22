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

init().then(() => {
    start()
})
