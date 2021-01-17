const server = require('./server')
const pipeline = require('./pipeline')
const deploy = require('./deploy')

async function post_task_server_op(op, name) {
    try {
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
        else {
            throw new Error('unknown op ' + op)
        }
    }
    catch (e) {
        console.error(e)
    }
}

async function post_pipeline_op(op, id) {
    try {
        if (op === 'run') {
            await pipeline.run(id)
        }
        else if (op === 'stop') {
            await pipeline.stop(id)
        }
        else if (op === 'clean') {
            await pipeline.rm(id)
        } 
        else {
            throw new Error('unknown op ' + op)
        }
    }
    catch (e) {
        console.error(e)
    }
}

async function post_deploy_task_op(op, param) {
    try {
        if (op === 'new') {
            await deploy.update_tasks(param)
        }
        else if (op === 'stop') {
            await deploy.update_tasks(null)
        }
        else {
            throw new Error('unknown op ' + op)
        }
    }
    catch (e) {
        console.error(e)
    }
}

async function post_clean_task(param) {
    try {
        await pipeline.clean_cache(param.vm_name, param.module_name)
    }
    catch (e) {
        console.error(e)
    }
}

function init_worker() {
    deploy.init()
}

module.exports = { init_worker, post_task_server_op, post_pipeline_op, post_deploy_task_op, post_clean_task }
