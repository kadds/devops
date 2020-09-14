const { m_server, m_mode } = require('../data')
const FLAGS = require('../flags')
const grpc = require('grpc')
const protoloader = require('@grpc/proto-loader')
const protoDef = protoloader.loadSync(__dirname + '/../../proto/server_instance.proto', {})
const pkgDef = grpc.loadPackageDefinition(protoDef)

const server_instance = pkgDef.ServerInstance

function get_client(server) { return new server_instance(server.ip + ':33453', grpc.ServerCredentials.createInsecure()) }

async function start(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_STOPPED) {
        return `server state is ${server.status} cannot start `
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_STARTING }, { where: { name, status: FLAGS.SVR_STATUS_STOPPED } })
    if (num !== 1) {
        return 'server start fail because of update check fail'
    }
    const client = get_client(server)
    const rsp = await client.DoOp({ op: pkgDef.DoOpReq.Op.start, name })
    if (rsp.err === '' || rsp.err === null) {
        return rsp.err
    }
    return ''
}

async function stop(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_RUNNING) {
        return `server state is ${server.status} cannot stop `
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_STOPPING }, { where: { name, status: FLAGS.SVR_STATUS_RUNNING } })
    if (num !== 1) {
        return 'server stop fail because of update check fail'
    }
    return ''
}

async function restart(name) {
    const server = await m_server.findByPk(name)
    if (server.status === FLAGS.SVR_STATUS_DESTROYING || server.status === FLAGS.SVR_STATUS_DESTROYED || server.status === FLAGS.SVR_STATUS_INIT) {
        return `server state is ${server.status} cannot start `
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_RESTARTING }, { where: { name, $or: [{ status: FLAGS.SVR_STATUS_RUNNING }, { status: FLAGS.SVR_STATUS_STOPPED }] } })
    if (num !== 1) {
        return 'server restart fail because of update check fail'
    }
}

async function init(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_INIT) {
        return `server state is ${server.status} cannot start `
    }

}

async function destroy(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_STOPPED) {
        console.log('server state is ' + server.status + ' cannot init')
        return
    }
    const [num] = await m_server.update({ status: FLAGS.SVR_STATUS_DESTROYING }, { where: { name, status: FLAGS.SVR_STATUS_STOPPED } })
    if (num !== 1) {
        console.log('server start fail')
    }

}

module.exports = { start, stop, init, destroy, restart }
