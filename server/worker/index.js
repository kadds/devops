const server = require('./server')
async function post_task_server_op(op, name) {
    if (op === 'init') {
        await server.init(name)
    }
    else if (op === 'stop') {
        await server.stop(name)
    }
    else if (op === 'start') {
        await server.start(name)
    }
    else if (op === 'restart') {
        await server.restart(name)
    }
    else if (op === 'destroy') {
        await server.destroy(name)
    }
}

module.exports = { post_task_server_op }
