import { post } from './comm'

async function query_log(req) {
    return (await post('/log/search', req)).list
}

export { query_log }
