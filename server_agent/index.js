const { init, start, stop, restart, destroy } = require('./server')
const grpc = require('grpc')
const protoloader = require('@grpc/proto-loader')
const protoDef = protoloader.loadSync(__dirname + '/../proto/server_instance.proto', {})
const pkgDef = grpc.loadPackageDefinition(protoDef)

const server_instance = pkgDef.ServerInstance

let server = new grpc.Server()

async function do_init(req, callback) {
    try {
        const ret = await init(req.name)
        callback(null, ret)
    }
    catch (e) {
        callback(e, {})
    }
}

async function do_op(req, callback) {
    try {
        let ret
        if (req.op === pkgDef.DoOpReq.Op.start) {
            ret = await start(name)
        }
        else if (req.op === pkgDef.DoOpReq.Op.stop) {
            ret = await stop(name)
        }
        else if (req.op === pkgDef.DoOpReq.Op.restart) {
            ret = await restart(name)
        }
        callback(null, ret)
    }
    catch (e) {
        callback(e, {})
    }
}

async function do_destroy(req, callback) {
    try {
        const ret = await destroy(req.name)
        callback(null, ret)
    }
    catch (e) {
        callback(e, {})
    }
}

server.addService(server_instance.service, {
    Init: do_init,
    DoOp: do_op,
    Destroy: do_destroy,
})

server.bind('0.0.0.0:33453', grpc.ServerCredentials.createInsecure())

server.start()
