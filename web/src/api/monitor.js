import { get } from './comm'
async function get_monitor_vm(vm) {
    return (await get('/monitor/vm?name=' + encodeURIComponent(vm))).data
}

export { get_monitor_vm }