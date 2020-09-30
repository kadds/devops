import { get, post } from './comm'

async function get_deploy_list() {
    return (await get('/deploy/list')).list
}

async function deploy_do_upload(id, servers_name) {
    return (await post('/deploy/upload', { id, server: servers_name }))
}

async function deploy_do_rollback(id, servers_name) {
    return (await post('/deploy/rollback', { id, server: servers_name }))
}

async function get_deploy(id) {
    return (await get('/deploy?id=' + id)).data
}

export { get_deploy_list, deploy_do_upload, deploy_do_rollback, get_deploy }
