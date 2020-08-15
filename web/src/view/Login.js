import React, { useState, createRef } from 'react'
import ReactDOM from 'react-dom';
import { login } from '../api/user'
import { Form, Input, Button, Checkbox, Modal, message } from 'antd'


function Login({ show, close_login_modal }) {
    let form = createRef()
    const layout = {
        labelCol: { span: 8 },
        wrapperCol: { span: 16 },
    };

    const [loading, set_loading] = useState(false)
    const onLogin = async () => {
        set_loading(true)
        const val = await form.current.validateFields()
        if (await login(val.username, val.password)) {
            message.info("wellcome " + val.username)
            set_loading(false)
            setTimeout(() => {
                window.location.reload();
            }, 200);
        }
        else {
            message.error("login fail, password error")
            set_loading(false)
            return
        }
        close_login_modal()
    };
    const onCancel = () => {
        close_login_modal()
    }

    return (<Modal
        okText='login'
        cancelText='cancel'
        onOk={onLogin}
        onCancel={onCancel}
        centered
        visible={show}
        loading={loading}
        title='login yourself'>
        <Form
            ref={form}
            {...layout}
            name="basic"
        >
            <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true, message: 'Please input your username!' }]}
            >
                <Input />
            </Form.Item>

            <Form.Item
                label="Password"
                name="password"
                rules={[{ required: true, message: 'Please input your password!' }]}
            >
                <Input.Password />
            </Form.Item>

        </Form>
    </Modal>)
}

export default Login