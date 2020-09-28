
import { get, post } from './comm'

async function get_scripts() {
    return (await get('/upload/list')).list
}

async function get_script(name) {
    return (await get('/upload/' + name)).data
}

async function upload_script(name, data) {
    return (await post('/upload/script', { name, data }))
}

async function delete_script(name) {
    return (await post('/upload/del', { name }))
}

export { get_scripts, get_script, upload_script, delete_script }