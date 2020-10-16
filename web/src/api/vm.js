
import { get, post } from './comm'

async function add_vm(data) {
    return (await post('/vm/create', data, { timeout: 5000 })).status
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

async function do_prepare_vm(name) {
    return (await post('vm/prepare', { name }))
}

async function get_vm_config(name) {
    return (await get('vm/config?name=' + encodeURIComponent(name))).data
}

async function update_vm_config(name, config) {
    return (await post('vm/config', { name, config }))
}

export { add_vm, get_all_vm, update_vm, delete_vm, do_prepare_vm, get_vm_config, update_vm_config }