import axios from 'axios'
import React from 'react'
import { message, Typography } from 'antd'
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
        message.error('server fail, please retry.')
        return Promise.reject('server fail')
    }
    if (rep.data.err === 401) {
        // need login
        store.dispatch(start_login())
        message.info('need login')
        return Promise.reject('need login')
    }
    else if (rep.data.err !== 0) {
        console.error(rep.data)
        message.error((<span> <Typography.Text>Server error. </Typography.Text>
            <Typography.Text type='danger' copyable>{rep.data.msg}</Typography.Text> </span>))
        return Promise.reject('server returns fail ' + rep.data.err)
    }
    return rep.data
}, error => {
    console.log(error)
    message.error(' ' + error)
    return Promise.reject(error)
})


async function get(url, opt) {
    return await instance.get(url, opt)
}

async function post(url, data, opt) {
    return await instance.post(url, data, opt)
}

async function put(url, data, opt) {
    return await instance.put(url, data, opt)
}

function set_token(token) {
    window.localStorage.setItem('token', token)
}

function remove_token() {
    window.localStorage.removeItem('token')
}
export { get, post, put, set_token, remove_token }

