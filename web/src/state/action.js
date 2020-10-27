import { START_LOGIN, CLOSE_LOGIN } from './actions'

function start_login() {
    return {
        type: START_LOGIN,
    }
}

function close_login(user) {
    return {
        type: CLOSE_LOGIN,
        user
    }
}

export { start_login, close_login }


