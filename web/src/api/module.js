import { get, post, put, set_token, remove_token } from './comm'

async function get_module_list() {
    return (await get('/module/list')).list
}

async function add_module(data) {
    return (await post('/module/', { module: data }))
}

async function update_module(data) {
    return (await post('/module/update', data))
}

export { get_module_list, add_module, update_module }
