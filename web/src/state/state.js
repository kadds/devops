import { createStore } from 'redux';

import { START_LOGIN, CLOSE_LOGIN } from './actions'

const initState = {
    is_login_show: false,
}

function login(state = initState, action) {
    if (action.type === START_LOGIN) {
        return {
            ...state,
            is_login_show: true,
        }
    }
    else if (action.type === CLOSE_LOGIN) {
        return {
            ...state,
            is_login_show: false,
        }
    }

    return state
}

export { login }