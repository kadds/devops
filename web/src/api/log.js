import { post } from './comm'

async function query_log(req) {
    let obj = (await post('/log/search', req))
    return [obj.list, obj.total]
}

async function click_query(v) {
    let obj = (await post('/log/click/search', v))
    return [obj.list, obj.total]
}

export { query_log, click_query }
