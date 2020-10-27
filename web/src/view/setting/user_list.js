import React, { useState, useEffect } from 'react'
import { user_list, add_user, rm_user, update_user } from '../../api/user'
import { Table, Button, Row, Col, Popconfirm, Modal, Form, Input } from 'antd'
import { connect } from 'react-redux'
import { QuestionCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

const UserList = (props) => {
    const [list, setList] = useState(null)
    const [loading, setLoading] = useState(false)
    const canOp = props.user.username === 'admin'
    const [needUpdate, setNeedUpdate] = useState()
    const [modal, setModal] = useState({ show: false, type: 0, username: null, loading: false })
    useEffect(() => {
        async function run() {
            setLoading(true)
            try {
                const list = await user_list()
                setList(list)
            }
            finally {
                setLoading(false)
            }
        }
        run()
    }, [needUpdate])

    const [form] = Form.useForm()

    const delUser = async (name) => {
        await rm_user(name)
        setNeedUpdate(needUpdate + 1)
    }

    const updateUser = (name) => {
        form.setFieldsValue({
            username: name,
            password: ''
        })
        setModal({ ...modal, show: true, type: 1, username: name, loading: false })
    }

    const addUser = () => {
        form.setFieldsValue({
            username: '',
            password: ''
        })
        setModal({ ...modal, show: true, type: 0, username: null, loading: false })
    }

    const onOk = async () => {
        let v = null
        setModal({ ...modal, loading: true })
        try {
            v = await form.validateFields()
        }
        catch (e) {
            setModal({ ...modal, loading: false })
            return
        }
        if (modal.type === 0) {
            await add_user(v)
        }
        else {
            await update_user(v)
        }
        setModal({ ...modal, loading: false, show: false })
        setNeedUpdate(needUpdate + 1)
    }

    const onCancel = () => {
        setModal({ ...modal, show: false })
    }

    const columns = [
        {
            title: 'username',
            dataIndex: 'username',
            key: 'username',
        },
        {
            title: 'mark',
            dataIndex: 'mark',
            key: 'mark',
        },
        {
            title: 'Operation',
            dataIndex: 'mark',
            key: 'mark',
            render: (v, r) => (<span>
                {
                    canOp && (
                        <Row gutter={[12, 12]}>
                            <Col>
                                <Button type='link' icon={<EditOutlined />} onClick={() => updateUser(r.username)}>Update</Button></Col>
                            <Col>
                                {
                                    r.username !== 'admin' && (
                                        <Popconfirm title='Delete User?' icon={<QuestionCircleOutlined />} onConfirm={() => delUser(r.username)}>
                                            <Button icon={<DeleteOutlined />} type='link' danger>Delete</Button>
                                        </Popconfirm>
                                    )
                                }
                            </Col>
                        </Row>
                    )
                }
            </span>)
        }
    ]
    return (
        <div>
            {
                canOp && (
                    <Row gutter={[12, 12]}>
                        <Col>
                            <Button type='primary' onClick={addUser}>New User</Button>
                        </Col>
                    </Row>
                )
            }
            <Table rowKey='username' columns={columns} dataSource={list} loading={loading}></Table>
            <Modal
                visible={modal.show}
                confirmLoading={modal.loading}
                onOk={onOk}
                onCancel={onCancel}
                centered
                okText={modal.type === 0 ? 'register' : 'update'}
                cancelText='cancel'
                title='add/modify user'
            >
                <Form form={form}>
                    <Form.Item label='Username' name='username' rules={[{ required: true, message: 'Please input username' }]}>
                        <Input disabled={modal.type === 1} />
                    </Form.Item>
                    <Form.Item label='Password' name='password' rules={[{ required: true, message: 'Please input password' }]}>
                        <Input.Password />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}


const mapStateToProps = state => {
    return {
        user: state.login.user
    }
}


const mapDispatchToProps = dispatch => {
    return {}
}

const VUserList = connect(
    mapStateToProps,
    mapDispatchToProps
)(UserList)


export default VUserList
