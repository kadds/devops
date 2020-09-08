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

export { get_server_list, add_server, update_server, get_server }
