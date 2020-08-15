import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { BrowserRouter, Route, Link, Switch } from 'react-router-dom'
import Main from './Main'
import { Provider } from 'react-redux'
import store from './state/store'

ReactDOM.render(
  <BrowserRouter>
    <Provider store={store}>
      <App>
        <Route path='/' exact component={Main}></Route>
      </App>
    </Provider>
  </BrowserRouter>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
