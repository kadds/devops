import { START_LOGIN, CLOSE_LOGIN, UPDATE_URI } from './actions'

function start_login() {
    return {
        type: START_LOGIN,
    }
}

function close_login() {
    return {
        type: CLOSE_LOGIN,
    }
}

function update_uri(url, title) {
    return {
        type: UPDATE_URI,
        url: url,
        title: title,
    }
}

export { start_login, close_login, update_uri }


