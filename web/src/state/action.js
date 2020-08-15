import { START_LOGIN, CLOSE_LOGIN } from './actions'

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

export { start_login, close_login }

