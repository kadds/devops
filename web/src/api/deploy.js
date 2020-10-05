import { get, post } from './comm'

async function get_deploy_list() {
    return (await get('/deploy/list')).list
}

async function deploy_do_upload(id, servers_name, opt) {
    return (await post('/deploy/upload', { id, servers: servers_name, opt }))
}

async function deploy_do_rollback(id, servers_name, opt) {
    return (await post('/deploy/rollback', { id, servers: servers_name, opt }))
}

async function get_deploy(id) {
    return (await get('/deploy?id=' + id)).data
}

async function stop_deploy(id, idx) {
    return (await post('/deploy/stop', { id, ids: [idx] }))
}

async function stop_deploys(id, indices) {
    return (await post('/deploy/stop', { id, ids: indices }))
}

export { get_deploy_list, deploy_do_upload, deploy_do_rollback, get_deploy, stop_deploy, stop_deploys }
