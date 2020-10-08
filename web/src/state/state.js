import { START_LOGIN, CLOSE_LOGIN, UPDATE_URI } from './actions'

const initState = {
    is_login_show: false,
}

const initStateUri = {
    url: null,
    title: 'Welcome devops'
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

function uri(state = initStateUri, action) {
    if (action.type === UPDATE_URI) {
        return {
            ...state,
            title: action.title,
            url: action.url
        }
    }
    return state
}

export { login, uri }