
import { get, post, put, set_token, remove_token } from './comm'

async function add_vm(data) {
    return (await post('/vm/create', data)).status
}

export { add_vm }