import axios from 'axios'

let instance = axios.create({
    baseURL: 'http://localhost:8077/',
    timeout: 1000,
    headers: { 'Content-Type': 'application / json' }
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

let request_token = ''

function set_token(token) {
    request_token = token
}

function remove_token() {
    request_token = ''
}

instance.interceptors.request.use(cfg => {
    cfg.headers.Token = request_token
    return cfg
},
    error => {
        return Promise.reject(error)
    })

instance.interceptors.response.use(rep => {
    if (rep.status != 200) {
        console.error(rep)
        Promise.reject('server fail')
    }
    if (req.data.err == 400) {
        // need login
        Promise.reject('need login')
    }
    return rep.data
}, error => {
    return Promise.reject(error)
})

export default { get, post, put, set_token, remove_token }

