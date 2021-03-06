import { post, get } from './comm'

async function get_variables() {
    const data = await get('/variable/list')
    return data.list
}

async function new_variable(name, value, flag) {
    await post('/variable/set', {name, value, flag})
}

async  function rm_variable(name) {
    await post('/variable/del', {name})
}

async function search_variables(key) {
    const data = await get('/variable/search?key=' + encodeURIComponent(key))
    return data.list
}

export { get_variables, new_variable, rm_variable, search_variables }