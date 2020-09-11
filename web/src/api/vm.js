
import { get, post, put, set_token, remove_token } from './comm'

async function add_vm(data) {
    return (await post('/vm/create', data)).status
}

async function get_all_vm() {
    return (await get('/vm/list')).list
}

async function update_vm(data) {
    return (await post('/vm/update', data)).status
}

async function delete_vm(name) {
    return (await post('vm/del', { name }))
}

export { add_vm, get_all_vm, update_vm, delete_vm }