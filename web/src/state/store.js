import { createStore, combineReducers, applyMiddleware } from 'redux'
import * as reducers from './state'
//生成store对象
const store = createStore(combineReducers(reducers), window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());

export default store