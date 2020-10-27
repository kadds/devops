import { get, post, set_token, remove_token } from './comm'

async function login(username, password) {
    const data = await post('/user/login', { username, password })
    if (data.err === 0) {
        set_token(data.token)
        return data.data
    }
    else {
        return null
    }
}

async function logout() {
    remove_token()
}

async function info(username) {
    const data = await get('/user?username=' + (username !== undefined ? username : ''))
    return data.data
}

async function user_list() {
    const data = await get('/user/list')
    return data.list
}

async function add_user(user) {
    await post('/user/add', { user })
}

async function rm_user(user) {
    await post('/user/rm', { user })
}

async function update_user(user) {
    await post('/user/password', { user })
}

async function update_mark(mark) {
    await post('/user/mark', { mark })
}

export { login, logout, info, user_list, add_user, rm_user, update_user, update_mark }