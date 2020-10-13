import { get } from './comm'
async function get_monitor_vm(vm) {
    return (await get('/monitor/vm?name=' + encodeURIComponent(vm))).data
}

async function get_monitor_server(name) {
    return (await get('/monitor/server?name=' + encodeURIComponent(name))).data
}

export { get_monitor_vm, get_monitor_server }