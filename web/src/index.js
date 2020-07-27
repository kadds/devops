import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import * as serviceWorker from './serviceWorker';
import { BrowserRouter, Route, Link, Switch } from 'react-router-dom'
import Login from './view/Login'
import Main from './Main'

ReactDOM.render(
  <React.StrictMode>
    <BrowserRouter>
      <App>
        <Route path='/login' component={Login}></Route>
        <Route path='/' exact component={Main}></Route>
      </App>
    </BrowserRouter>
  </React.StrictMode>,
  document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
