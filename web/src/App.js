import React from 'react';
import './App.css';
import VLogin from './view/VLogin'


function App(props) {
  return (
    <div className="App">
      {props.children}
      <VLogin></VLogin>
    </div>
  );
}

export default App;
