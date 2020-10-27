import { createStore, combineReducers } from 'redux'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import * as reducers from './state'

const persistConfig = {
    key: 'root',
    storage,
}
const root = persistReducer(persistConfig, combineReducers(reducers))

const store = createStore(root, window.__REDUX_DEVTOOLS_EXTENSION__ && window.__REDUX_DEVTOOLS_EXTENSION__());
const persistor = persistStore(store)

export { store, persistor }
