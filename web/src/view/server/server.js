import React, { useState, useEffect } from 'react'
import { get_server_list, add_server, update_server, get_server } from '../../api/server'
import { get_all_vm } from '../../api/vm'
import { get_module_list } from '../../api/module'

import { Button, Spin, Row, Select, Descriptions, Typography, Card, Input, Form, Modal, InputNumber, message, Col, Space, Checkbox, Tag, Badge, Statistic } from 'antd'
import { FireOutlined, PoweroffOutlined, CloseOutlined } from '@ant-design/icons'

const Server = (props) => {
    const [listDetail, setListDetail] = useState({ loading: false, data: [] })
    const [state, setState] = useState({ visible: false, loading: false, type: 0 })
    const [moduleList, setModuleList] = useState({ loading: false, data: [] })
    const [vmList, setVmList] = useState({ loading: false, data: [] })
    const [server, setServer] = useState(null)

    useEffect(() => {
        async function run() {
            setListDetail({ loading: true, data: [] })
            let data = await get_server_list(props.mode_name)
            if (props.mode_name) {
                data.sort((a, b) => { return a.ctime > b.ctime })
                setListDetail({ loading: false, data })
            }
            else {
                let group = {}
                for (let d of data) {
                    if (group[d.mode_name] === undefined) {
                        group[d.mode_name] = []
                    }
                    group[d.mode_name].push(d)
                }
                console.log(group)
                setListDetail({ loading: false, group })
            }
        }
        run()
    }, [props.mode_name])

    const [form] = Form.useForm()
    const onNewClick = async () => {
        setState({ visible: true, loading: false, type: 0 })
        setModuleList({ loading: true, data: [] })
        setVmList({ loading: true, data: [] })
        const [vmdata, moduledata] = await Promise.all([get_all_vm(), get_module_list()])
        setModuleList({ loading: false, data: moduledata })
        setVmList({ loading: false, data: vmdata })
        form.setFieldsValue({
            mode_name: props.mode_name,
            flag_env: 'normal'
        })
    }

    const onModalOk = async () => {
        setState({ ...state, loading: true })
        let val
        try {
            val = await form.validateFields()
            val.is_test = false
            val.is_gray = false
            if (val.flag_env === 'test') {
                val.is_test = true
            }
            else if (val.flag_env === 'gray') {
                val.is_gray = true
            }
            val.flag_env = undefined
            await add_server(val)
        }
        catch (e) {
            setState({ ...state, loading: false })
            return
        }
        setState({ ...state, loading: false })
    }

    const onModalCancel = async () => {
        setState({ ...state, loading: true, visible: false })
    }
    const onServerChange = async (server_name) => {
        setListDetail({ ...listDetail, select: server_name })
        const server = await get_server(server_name)
        setServer(server)
    }

    const StatusRender = () => {
        if (server.status === 1) {
            return (<Badge status='Default' text='init'></Badge>)
        }
        else if (server.status === 2) {
            return (<Badge status='Warning' text='stop'></Badge>)
        }
        else if (server.status === 3) {
            return (<Badge status='Success' text='running'></Badge>)
        }
        else if (server.status === 4) {
            return (<Badge status='Error' text='core dump'></Badge>)
        }
        else if (server.status === 5) {
            return (<Badge status='Processing' text='restart'></Badge>)
        }
        else if (server.status === 6) {
            return (<Badge status='Default' text='destroy'></Badge>)
        }
        return (<Badge status='Error' text='Unknown'></Badge>)
    }

    const FlagRender = () => {
        if (server.flag & 1) {
            return (<Tag color="orange" icon={<FireOutlined />}>
                Test
            </Tag>)
        }
        else if (server.flag & 2) {
            return (<Tag color="blue" icon={<FireOutlined />}>
                Gray
            </Tag>)
        }
        else {
            return 'None'
        }

    }

    const ReaderSelectGroup = () => {
        if (listDetail.group) {
            return (
                <Select style={{ minWidth: '120px' }} onChange={onServerChange} value={listDetail.select}>
                    {
                        Object.entries(listDetail.group).map(([name, it]) => (
                            <Select.OptGroup label={name} key={name}>
                                {
                                    it.map(item =>
                                        (
                                            <Select.Option key={item.name} value={item.name}> {item.name}</Select.Option>
                                        )
                                    )
                                }
                            </Select.OptGroup>
                        ))
                    }
                </Select>
            )
        }
        else {
            return (
                <Select style={{ minWidth: '120px' }} onChange={onServerChange} value={listDetail.select}>
                    {
                        listDetail.data.map(item =>
                            (
                                <Select.Option key={item.name} value={item.name}> {item.name}</Select.Option>
                            )
                        )
                    }
                </Select>
            )
        }
    }

    return (
        <div>
            <Row>
                <Col>
                    <Space>
                        <Typography.Text>
                            {props.mode_name ? 'Module ' + props.mode_name + ' servers' : 'All module servers'}
                        </Typography.Text>
                        <Spin spinning={listDetail.loading}>
                            <ReaderSelectGroup></ReaderSelectGroup>
                        </Spin>
                        <Typography.Text>
                            Or
                </Typography.Text>
                        <Button type='primary' onClick={onNewClick}>
                            Create New Server
                </Button>
                    </Space>
                </Col>
            </Row>
            {
                server && (
                    <Row gutter={8} style={{ marginTop: 30 }}>
                        <Col span={16}>
                            <Card title={'Information Of ' + server.name}>
                                <Row gutter={32}>
                                    <Col span={8}>
                                        <Typography.Title level={4}>
                                            Status:
                                        </Typography.Title>
                                        <StatusRender></StatusRender>
                                    </Col>
                                    <Col span={8}>
                                        <Typography.Title level={4}>
                                            Flag:
                                        </Typography.Title>
                                        <FlagRender></FlagRender>
                                    </Col>
                                    <Col span={8}>
                                        <Typography.Title level={4}>
                                            Time:
                                        </Typography.Title>
                                        {new Date(server.ctime).toLocaleString()}
                                    </Col>
                                </Row>
                                <Row gutter={32} style={{ marginTop: 32 }}>
                                    <Col span={12}>
                                        <Typography.Title level={4}>
                                            VM:
                                        </Typography.Title>
                                        {server.vm_name}
                                    </Col>
                                    <Col span={12}>
                                        <Typography.Title level={4}>
                                            Module:
                                        </Typography.Title>
                                        {server.mode_name}
                                    </Col>
                                </Row>
                            </Card>
                        </Col>
                        <Col span={8}>
                            <Card title='Operation'>
                                <Button>Restart</Button>
                                <Button icon={<PoweroffOutlined />}>StopRunning</Button>
                                <Button icon={<CloseOutlined />}>DestroyServer</Button>
                            </Card>
                        </Col>
                    </Row>
                )
            }
            <Modal
                visible={state.visible}
                title='Create/Edit Server'
                okText='Save'
                cancelText='Cancel'
                onOk={onModalOk}
                onCancel={onModalCancel}
                confirmLoading={state.loading}
                centered
            >
                <Form labelCol={{ span: 6 }} wrapperCol={{ flex: 1 }} form={form}>
                    <Form.Item label='Name' name='name' rules={[{ required: true, message: 'Please input server name' }]}>
                        <Input disabled={state.type != 0} />
                    </Form.Item>
                    <Form.Item label='Module' name='mode_name' rules={[{ required: true, message: 'Please select module' }]}>
                        <Select >
                            {moduleList.data && moduleList.data.map(val =>
                                (
                                    <Select.Option key={val.name} value={val.name}>{val.name}</Select.Option>
                                )
                            )}
                        </Select>
                    </Form.Item>
                    <Form.Item label='VM' name='vm_name' rules={[{ required: true, message: 'Please select vm' }]}>
                        <Select>
                            {vmList.data && vmList.data.map(val =>
                                (
                                    <Select.Option key={val.name} value={val.name}>{val.name}</Select.Option>
                                )
                            )}
                        </Select>
                    </Form.Item>
                    <Form.Item label='Environment' name='flag_env' rules={[{ required: true, message: 'Please select env' }]}>
                        <Select>
                            <Select.Option value={'none'} key='none'>Normal</Select.Option>
                            <Select.Option value={'test'} key='test'>Test</Select.Option>
                            <Select.Option value={'gray'} key='gray'>Gray</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>

            </Modal>
        </div>
    )
}

export default Server
