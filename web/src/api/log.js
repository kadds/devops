import { post } from './comm'

async function query_log(req) {
    let obj = (await post('/log/search', req, { timeout: 30000 }))
    return [obj.list, obj.total]
}

async function click_query(v) {
    let obj = (await post('/log/click/search', v, { timeout: 30000 }))
    return [obj.list, obj.total]
}

export { query_log, click_query }
