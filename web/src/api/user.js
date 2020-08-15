import { get, post, put, set_token, remove_token } from './comm'

async function login(username, password) {
    const data = await post('/user/login', { username, password })
    if (data.err === 0) {
        set_token(data.token)
        return true
    }
    else {
        return false
    }
}

async function logout() {
    remove_token()
}

async function info(username) {
    const data = await get('/user?username=' + (username !== undefined ? username : ''))
    return data.data
}


export { login, logout, info }