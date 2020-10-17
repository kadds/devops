import React, { useState, useEffect } from 'react'
import { Button, Badge, Table, Input, Row, Col, Popconfirm, Form, Modal, InputNumber, message, Spin } from 'antd'
import { add_vm, get_all_vm, update_vm, delete_vm, do_prepare_vm, get_vm_config, update_vm_config } from '../../api/vm'
import { LineChartOutlined, QuestionCircleOutlined, EditOutlined, DeleteOutlined, FileSyncOutlined } from '@ant-design/icons'
import moment from 'moment'
import { withRouter } from 'react-router'
import queryString from 'query-string'

const VM = (props) => {

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
            // update
            if (!val.password) {
                val.password = undefined
            }
            if (!val.private_key) {
                val.private_key = undefined
            }
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

    const goMonitor = (name) => {
        props.history.push({ pathname: '/monitor', search: '?vm=' + encodeURIComponent(name) })
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

    const [form2] = Form.useForm()
    const [configState, setConfigState] = useState({ visible: false, loading: false, vm: null, dataLoading: false })
    const onConfigModalOk = async (v) => {
        setConfigState({ ...configState, loading: true })
        let val
        try {
            val = await form2.validateFields()
        }
        catch (e) {
            setConfigState({ ...configState, loading: false })
            return
        }
        await update_vm_config(configState.vm, val.config)
        // restart vm
        await do_prepare_vm(configState.vm)
        setConfigState({ ...configState, visible: false, loading: false })
    }

    const onConfigModalCancel = () => {
        setConfigState({ ...configState, visible: false, loading: false })
    }

    const redoClick = async (name) => {
        setConfigState({ visible: true, loading: false, vm: name, dataLoading: true })
        const config = await get_vm_config(name)
        form2.setFieldsValue({
            config
        })
        setConfigState({ visible: true, loading: false, vm: name, dataLoading: false })
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
            render: text => <span>{moment(text).format('lll')}</span>
        },
        {
            title: 'Op',
            dataIndex: 'name',
            key: 'name',
            render: (i, r) => (<Row gutter={[8, 8]}>
                <Col>
                    <Button type='link' disabled={isDel} icon={<EditOutlined />} onClick={() => editClick(r)}>Edit</Button>
                </Col>
                <Col>
                    <Button type='link' disabled={isDel} icon={<FileSyncOutlined />} onClick={() => redoClick(r.name)}>Sync</Button>
                </Col>
                <Col>
                    <Popconfirm title="Are you sure？" onConfirm={() => deleteClick(r)} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                        <Button danger type='link' icon={<DeleteOutlined />} loading={isDel}>Delete</Button>
                    </Popconfirm>
                </Col>
                <Col>
                    <Button type='link' disabled={isDel} icon={<LineChartOutlined />} onClick={() => goMonitor(r.name)}>Monitor</Button>
                </Col>
            </Row>)

        }
    ]

    const vm_name = queryString.parse(props.location.search).name

    useEffect(() => {
        async function run() {
            const list = await get_all_vm()
            setData(list)
        }
        run()
    }, [state.need_update, vm_name])


    return (
        <div className='page'>
            <div style={{ textAlign: 'left' }}>
                <Button type='primary' onClick={addVm}>Add</Button>
            </div>
            <Table rowClassName={(record, index) => {
                if (record.name === vm_name) {
                    return 'table_item_blink'
                }
                return 'table_item_noraml'
            }} pagination={false} rowKey={'name'} dataSource={data} columns={columns}></Table>
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
            <Modal
                visible={configState.visible}
                title='Edit Config'
                okText='Save And Restart'
                cancelText='Cancel'
                onOk={onConfigModalOk}
                onCancel={onConfigModalCancel}
                confirmLoading={configState.loading || configState.dataLoading}
                centered
            >
                <Spin spinning={configState.dataLoading}>

                    <Form form={form2}>
                        <Form.Item label='Config' name='config' rules={[{ required: true, message: 'Please input config' }]}>
                            <Input.TextArea className='code_edit' autoSize={{ minRows: 10 }} />
                        </Form.Item>
                    </Form>
                </Spin>
            </Modal>
        </div>
    )
}

export default withRouter(VM)
