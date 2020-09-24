import { get, post } from './comm'

async function get_module_list() {
    return (await get('/module/list')).list
}

async function add_module(data) {
    return (await post('/module/', { module: data }))
}

async function update_module(data) {
    return (await post('/module/update', { module: data }))
}

async function delete_module(name) {
    return (await post('/module/del', { name: name }))
}

export { get_module_list, add_module, update_module, delete_module }
