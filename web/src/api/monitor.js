import { post } from './comm'
async function get_monitor_vm(vm, time) {
    return (await post('/monitor/vm', { vm_name: vm, time })).data
}

async function get_monitor_server(name, time) {
    return (await post('/monitor/server', { server_name: name, time })).data
}

async function get_call_graph(tid, time) {
    return (await post('/monitor/call', { tid, time })).list
}

export { get_monitor_vm, get_monitor_server, get_call_graph }