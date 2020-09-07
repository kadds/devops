
import { get, post, put, set_token, remove_token } from './comm'

async function get_scripts() {
    return (await get('/upload/list')).list
}

async function get_script(name) {
    return (await get('/upload/' + name)).data
}

async function upload_script(name, data) {
    return (await post('/upload/script', { name, data }))
}

export { get_scripts, get_script, upload_script }