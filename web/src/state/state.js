import { START_LOGIN, CLOSE_LOGIN } from './actions'

const initState = {
    is_login_show: false,
    user: null,
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
            user: action.user
        }
    }

    return state
}

export { login }