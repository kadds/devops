const server = require('./server')
const pipeline = require('./pipeline')
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

async function post_pipeline_op(op, id) {
    if (op === 'run') {
        await pipeline.run(id)
    }
    else if (op === 'stop') {
        await pipeline.stop(id)
    }
}

async function post_deploy_task_op(op, deploy_id) {
    if (op === 'new') {
    }
    else if (op === 'stop') {

    }
}

module.exports = { post_task_server_op, post_pipeline_op, post_deploy_task_op }
