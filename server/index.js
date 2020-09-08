const express = require('express')
const mode = require('./routers/mode')
const pipeline = require('./routers/pipeline')
const server = require('./routers/server')
const vm = require('./routers/vm')
const user = require('./routers/user')
const { valid_token } = require('./token')
const { init } = require('./data')
const process = require('process')
const upload = require('./routers/upload')

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
        const t = process.hrtime()
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
        const t2 = process.hrtime()
        const delta = Math.round(t2[0] * 1000 + t2[1] / 1000000 - (t[0] * 1000 + t[1] / 1000000), 1)
        console.log('> request ' + req.originalUrl + ' cost ' + delta)
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

    app.listen(8077)
    console.log("start listen")
}

init().then(() => {
    start()
})
