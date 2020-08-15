import axios from 'axios'
import { message } from 'antd'
import store from '../state/store'
import { start_login } from '../state/action'

let instance = axios.create({
    baseURL: 'http://localhost:8077',
    timeout: 2000,
    headers: { 'Content-Type': 'application/json' },
})

instance.interceptors.request.use(cfg => {
    let token = window.localStorage.getItem('token')
    if (token == null)
        token = ''
    cfg.headers['Token'] = token
    return cfg
},
    error => {
        return Promise.reject(error)
    })

instance.interceptors.response.use(rep => {
    if (rep.status !== 200) {
        console.error(rep)
        message.error('server fail')
        return Promise.reject('server fail')
    }
    if (rep.data.err === 401) {
        // need login
        store.dispatch(start_login())
        message.info('need login')
        return Promise.reject('need login')
    }
    return rep.data
}, error => {
    console.log(error)
    message.error(' ' + error)
    return Promise.reject(error)
})


async function get(url) {
    return await instance.get(url)
}

async function post(url, data) {
    return await instance.post(url, data)
}

async function put(url, data) {
    return await instance.put(url, data)
}

function set_token(token) {
    window.localStorage.setItem('token', token)
}

function remove_token() {
    window.localStorage.removeItem('token')
}
export { get, post, put, set_token, remove_token }

