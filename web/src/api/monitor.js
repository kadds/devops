import { post } from './comm'
async function get_monitor_vm(vm, time) {
    return (await post('/monitor/vm', { vm_name: vm, time }, { timeout: 60000 })).data
}

async function get_monitor_server(name, time) {
    return (await post('/monitor/server', { server_name: name, time }, { timeout: 60000 })).data
}

async function get_call_graph(tid, time) {
    const ret = (await post('/monitor/call', { tid, time }, { timeout: 60000 })).list
    return { list: ret.list, entry: ret.entry }
}

async function get_rpc_info(servers, time) {
    return (await post('/monitor/rpc', { server_name: servers, time }, { timeout: 60000 })).list
}

export { get_monitor_vm, get_monitor_server, get_call_graph, get_rpc_info }