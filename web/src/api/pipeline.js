import { get, post, put, set_token, remove_token } from './comm'

async function get_pipelines() {
    return (await get('/pipeline/list')).data
}

export { get_pipelines }