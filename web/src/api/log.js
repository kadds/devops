import { post } from './comm'

async function query_log(req) {
    let obj = (await post('/log/search', req))
    return { list: obj.list, count: obj.count }
}

export { query_log }
