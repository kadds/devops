const express = require('express')
const mode = require('./routers/mode')
const pipeline = require('./routers/pipeline')
const server = require('./routers/server')
const vm = require('./routers/vm')
const user = require('./routers/user')
const { valid_token } = require('./token')
const { init } = require('./data')

function start() {
    const app = express()
    app.on('error', (val) => {
        console.log(val)
    })

    app.use(express.json())
    app.use('/', (req, rsp, next) => {
        rsp.set("Content-Type", "application/json")
        next()
    })
    app.use('/', (req, rsp, next) => {
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

    app.use('/mode', mode)
    app.use('/pipeline', pipeline)
    app.use('/vm', vm)
    app.use('/server', server)
    app.use('/user', user)

    app.listen(8077)
    console.log("start listen")
}

init().then(() => {
    start()
})
