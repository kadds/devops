import React, { useState, useEffect } from 'react'
import { Button, Badge, Card, Statistic, Progress, Dropdown, Menu, Input, Row, Col, Popconfirm, Form, Modal, InputNumber, message, Spin } from 'antd'
import { add_vm, get_all_vm, update_vm, delete_vm, do_prepare_vm, get_vm_config, update_vm_config, vm_detail } from '../../api/vm'
import { LineChartOutlined, QuestionCircleOutlined, EditOutlined, DeleteOutlined, FileSyncOutlined, CloudServerOutlined } from '@ant-design/icons'
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

    const deleteClick = async (e) => {
        try {
            await delete_vm(e.name)
        }
        catch (e) {
        }
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

    const redoClick = async (v) => {
        const name = v.name
        setConfigState({ visible: true, loading: false, vm: name, dataLoading: true })
        const config = await get_vm_config(name)
        form2.setFieldsValue({
            config
        })
        setConfigState({ visible: true, loading: false, vm: name, dataLoading: false })
    }

    const cardClick = () => {

    }

    const vm_name = queryString.parse(props.location.search).name

    useEffect(() => {
        async function run() {
            const list = await get_all_vm()
            setData(list)
            const new_list = []
            for (let v of list) {
                const d = await vm_detail(v.name)
                console.log(d)
                new_list.push({ ...v, ...d })
            }
            console.log(new_list)
            setData(new_list)
        }
        run()
    }, [state.need_update, vm_name])

    const onInfoMouseEnter = async (v) => {
        const d = await vm_detail(v.name)
        v = { ...v, ...d }
        setData(data => {
            const idx = data.findIndex(it => it.name === v.name)
            if (idx >= 0) {
                data[idx] = v
                return [].concat(data)
            }
            else {
                return data
            }
        })
    }

    const detailServerClick = (name) => {
        props.history.push({ pathname: '/server', search: '?name=' + encodeURIComponent(name) })
    }

    const ServerMenu = (props) => {
        return (<Menu {...props}>
            {
                props.vm.servers.map(server => (
                    <Menu.Item key={server} onClick={() => detailServerClick(server)}>
                        {server}
                    </Menu.Item>
                ))
            }
        </Menu>)
    }

    return (
        <div className='page'>
            <Row>
                <Col>
                    <Button type='primary' onClick={addVm}>Add</Button>
                </Col>
            </Row>

            <div style={{ textAlign: 'left', display: 'flex' }}>
                {
                    data.map(v => (
                        <div className='card' key={v.name} style={{ margin: '20px 20px 0 0', display: 'inline-block' }}>
                            <Card className={{ 'item_blink': vm_name === v.name, 'card_normal': true, 'card_readonly': true }} size='small'
                                key={v.name} onClick={() => { cardClick(v) }}
                                style={{ maxWidth: 340, width: 340 }}
                                extra={<Row gutter={6}>
                                    <Col>
                                        <Button icon={<LineChartOutlined />} size='small' onClick={() => goMonitor(v.name)} />
                                    </Col>
                                    <Col>
                                        <Badge status={v.flag !== 1 ? 'processing' : 'success'}></Badge>
                                    </Col>
                                </Row>}
                                title={v.name}
                                actions={
                                    [<EditOutlined key="editing" onClick={() => editClick(v)} />,
                                    <FileSyncOutlined key="editing" onClick={() => redoClick(v)} />,
                                    <div><Dropdown trigger={['click']} overlay={<ServerMenu vm={v} />}>
                                        <span style={{ display: 'inline-block' }} className='full_fill'><CloudServerOutlined /> {v.servers.length}</span>
                                    </Dropdown></div>,
                                    <div>
                                        <Popconfirm title="Confirm delete this VM?" onConfirm={() => deleteClick(v)} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                                            <DeleteOutlined className='full_fill' />
                                        </Popconfirm>
                                    </div>
                                    ]}
                            >
                                <div style={{ height: 77, overflowY: 'auto' }}>
                                    <Spin spinning={v.cpu_num === undefined}>
                                        <Row gutter={0}>
                                            <Col span={6}>
                                                <Statistic title="CPU" value={v.cpu_num} />
                                            </Col>
                                            <Col span={12}>
                                                <Statistic title="Memory (All) " value={v.mem_total} suffix='MiB' precision={0} />
                                            </Col>
                                            <Col span={6}>
                                                <Statistic prefix={
                                                    <Progress onMouseEnter={() => onInfoMouseEnter(v)} size='small' type="circle" width={40}
                                                        percent={Math.floor((v.mem_total - v.mem_avl) / v.mem_total * 100)}></Progress>
                                                } title="Memory %" value='' className='statistic' />
                                            </Col>
                                        </Row>
                                    </Spin>
                                </div>
                            </Card >
                        </div>
                    ))
                }
            </div>

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
                okText='Save And Reload'
                cancelText='Cancel'
                onOk={onConfigModalOk}
                onCancel={onConfigModalCancel}
                confirmLoading={configState.loading || configState.dataLoading}
                centered
                width='80%'
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
