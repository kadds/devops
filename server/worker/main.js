
const server = require('./server')

async function do_server(msg) {
    if (msg.op === 'init') {
        await server.init(msg.server)
    }
    else if (msg.op === 'stop') {
        await server.stop(msg.server)
    }
    else if (msg.op === 'start') {
        await server.start(msg.server)
    }
    else if (msg.op === 'restart') {
        await server.stop(msg.server)
        await server.start(msg.server)
    }
    else if (msg.op === 'destroy') {
        await server.destroy(msg.server)
    }
}

module.exports = { do_server }
