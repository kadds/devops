import { get, post, put, set_token, remove_token } from './comm'

async function get_server_list(module_name) {
    if (module_name)
        return (await get('/server/list?name=' + module_name)).list
    else
        return (await get('/server/list?name=')).list
}

async function add_server(data) {
    return (await post('/server/', { server: data }))
}

async function update_server(data) {
    return (await post('/server/update', data))
}

async function get_server(server_name) {
    return (await get('/server?name=' + server_name)).data
}

async function start_server(server_name) {
    return (await post('/server/start', { name: server_name }))
}

async function stop_server(server_name) {
    return (await post('/server/stop', { name: server_name }))
}

async function restart_server(server_name) {
    return (await post('/server/restart', { name: server_name }))
}

async function destroy_server(server_name) {
    return (await post('/server/destroy', { name: server_name }))
}

export { get_server_list, add_server, update_server, get_server, start_server, stop_server, restart_server, destroy_server }
