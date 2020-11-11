import React, { useState } from 'react'
import { login } from '../api/user'
import { Form, Input, Modal, message } from 'antd'
import { useHistory } from 'react-router'

function Login({ show, close_login_modal }) {
    let [form] = Form.useForm()
    const layout = {
        labelCol: { span: 8 },
        wrapperCol: { span: 16 },
    }
    const history = useHistory()

    const [loading, set_loading] = useState(false)
    const onLogin = async () => {
        set_loading(true)
        const val = await form.validateFields()
        let user = await login(val.username, val.password)
        if (user) {
            message.info("Welcome " + val.username)
            set_loading(false)
            setTimeout(() => {
                history.go(0)
            }, 200);
        }
        else {
            message.error("login fail, password error")
            set_loading(false)
            return
        }
        close_login_modal(user)
    };
    const onCancel = () => {
        close_login_modal(null)
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
            form={form}
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