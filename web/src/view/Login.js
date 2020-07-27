import React from 'react';
import ReactDOM from 'react-dom';

function Login(props) {
    const onLogin = () => {
        props.history.push("/");
    };
    return (
        <div>
            login
        </div>
    );
}

export default Login;