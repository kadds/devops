import React, { useState, useEffect } from 'react'
import { Button, Badge, Table, Input, Row, Col, Popconfirm, Form, Modal, InputNumber, message } from 'antd'
import { add_vm, get_all_vm, update_vm, delete_vm, do_prepare_vm } from '../../api/vm'
import { QuestionCircleOutlined, EditOutlined } from '@ant-design/icons'

const VM = () => {
    const [state, setState] = useState({ visible: false, type: 0, loading: false, need_update: 0 })
    const [data, setData] = useState([])
    const addVm = () => {
        setState({ ...state, visible: true, type: 0, loading: false })
    }
    const [form] = Form.useForm()

    const onModalOk = async () => {
        setState({ ...state, loading: true })
        let val
        try {
            val = await form.validateFields()
        }
        catch (e) {
            setState({ ...state, loading: false })
            return
        }
        if (state.type === 0) {
            const ret = await add_vm({ vm: val })
            if (ret === 0) {
                // ok
                message.info('Create VM done!')
                setState({ ...state, loading: false, visible: false, need_update: state.need_update + 1 })
            }
            else {
                message.error('VM connection test fail, check your ip/password', 4)
                setState({ ...state, loading: false })
            }
        }
        else {
            const ret = await update_vm({ vm: val })
            if (ret === 0) {
                // ok
                message.info('Update VM done!')
                setState({ ...state, loading: false, visible: false, need_update: state.need_update + 1 })
            }
            else {
                message.error('VM connection test fail, check your ip/password', 4)
                setState({ ...state, loading: false })
            }
        }
    }
    const onModalCancel = () => {
        setState({ ...state, visible: false })
    }

    const editClick = (e) => {
        form.setFieldsValue({
            name: e.name,
            ip: e.ip,
            port: e.port,
            user: e.user,
            password: '',
            private_key: '',
            base_dir: e.base_dir
        })
        setState({ ...state, visible: true, type: 1, loading: false })
    }

    const [isDel, setIsDel] = useState(false)
    const deleteClick = async (e) => {
        setIsDel(true)
        try {
            await delete_vm(e.name)
        }
        catch (e) {
        }
        setIsDel(false)
        setState({ ...state, need_update: state.need_update + 1 })
    }

    const redoClick = async (name) => {
        await do_prepare_vm(name)
        message.success('Redo preparing.')
    }

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, r) => <Badge status={r.flag !== 1 ? 'processing' : 'success'} text={text}></Badge>
        },
        {
            title: 'IP/host',
            dataIndex: 'ip',
            key: 'ip',
            render: text => <span>{text}</span>
        },
        {
            title: 'Port',
            dataIndex: 'port',
            key: 'port',
        },
        {
            title: 'Base directory',
            dataIndex: 'base_dir',
            key: 'base_dir',
        },
        {
            title: 'Create time',
            dataIndex: 'ctime',
            key: 'ctime',
            render: text => <span>{new Date(text).toLocaleString()}</span>
        },
        {
            title: 'Op',
            dataIndex: 'name',
            key: 'name',
            render: (i, r) => (<Row gutter={[8, 8]}> <Col> <Button disabled={isDel} icon={<EditOutlined />} onClick={() => editClick(r)}>Edit</Button> </Col>
                <Col>
                    <Button disabled={isDel} onClick={() => redoClick(r.name)}>Sync</Button>
                </Col>
                <Col>
                    <Popconfirm title="Are you sure？" onConfirm={() => deleteClick(r)} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                        <Button danger loading={isDel}>Delete</Button>
                    </Popconfirm> </Col>
            </Row>)

        }
    ]

    useEffect(() => {
        async function run() {
            const list = await get_all_vm()
            setData(list)
        }
        run()
    }, [state.need_update])

    return (
        <div className='page'>
            <div style={{ textAlign: 'left' }}>
                <Button type='primary' onClick={addVm}>Add</Button>
            </div>
            <Table rowKey={'name'} dataSource={data} columns={columns}></Table>
            <Modal
                visible={state.visible}
                title='Create/Edit VM'
                okText='Save/Test'
                cancelText='Cancel'
                onOk={onModalOk}
                onCancel={onModalCancel}
                confirmLoading={state.loading}
                centered
            >
                <Form form={form}>
                    <Form.Item label='Name' name='name' rules={[{ required: true, message: 'Please input vm name' }]}>
                        <Input disabled={state.type !== 0} />
                    </Form.Item>
                    <Form.Item label='IP' name='ip' rules={[{ required: true, message: 'Please input vm ip address' }]}>
                        <Input disabled={state.type !== 0} />
                    </Form.Item>
                    <Form.Item initialValue={22} label='Port' name='port' rules={[{ required: true, message: 'Please input vm port' }]}>
                        <InputNumber max={65535} />
                    </Form.Item>
                    <Form.Item label='Password' name='password'>
                        <Input />
                    </Form.Item>
                    <Form.Item label='Private Key' name='private_key'>
                        <Input.TextArea minLength={20} />
                    </Form.Item>
                    <Form.Item label='User' name='user' rules={[{ required: true, message: 'Please input vm login username' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label='Base Dir' name='base_dir' rules={[{ required: true, message: 'Please input base dir' }]}>
                        <Input />
                    </Form.Item>
                </Form>

            </Modal>
        </div>
    )
}

export default VM
