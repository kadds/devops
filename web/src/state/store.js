import { createStore, combineReducers, applyMiddleware } from 'redux'
import * as reducers from './state'
//生成store对象
const store = createStore(combineReducers(reducers));

export default store