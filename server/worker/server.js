const { m_server, m_mode } = require('../data')
const FLAGS = require('../flags')

async function start(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_STOP) {
        console.log('server state is ' + server.status + ' cannot start')
        return
    }

}

async function stop(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_RUNNING) {
        console.log('server state is ' + server.status + ' cannot stop')
        return
    }
}

async function restart(name) {
    const server = await m_server.findByPk(name)
    if (server.status === FLAGS.SVR_STATUS_DESTROYING || server.status === FLAGS.SVR_STATUS_DESTROYED || server.status === FLAGS.SVR_STATUS_INIT) {
        console.log('server state is ' + server.status + ' cannot start')
        return
    }
}

async function init(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_INIT) {
        console.log('server state is ' + server.status + ' cannot init')
        return
    }
}

async function destroy(name) {
    const server = await m_server.findByPk(name)
    if (server.status !== FLAGS.SVR_STATUS_STOPPED) {
        console.log('server state is ' + server.status + ' cannot init')
        return
    }
}

module.exports = { start, stop, init, destroy, restart }
