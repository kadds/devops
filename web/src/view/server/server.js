import React, { useState, useEffect, useCallback, useRef, useImperativeHandle } from 'react'
import { get_server_list, add_server, get_server, destroy_server, stop_server, start_server, restart_server } from '../../api/server'
import { get_all_vm } from '../../api/vm'
import { get_module_list } from '../../api/module'
import { useInterval } from '../../comm/util'
import { Button, Spin, Row, Select, Popconfirm, Typography, Card, Input, Form, Modal, Col, Space, Tag, Badge } from 'antd'
import { FireOutlined, PoweroffOutlined, CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { withRouter } from 'react-router'
import moment from 'moment'

const getServerRunningTime = (delta) => {
    if (delta) {
        let rest = delta
        const day = Math.floor(rest / (60 * 60 * 24))
        rest -= day * (60 * 60 * 24)
        const hour = Math.floor(rest / (60 * 60))
        rest -= hour * 60 * 60
        const minute = Math.floor(rest / 60)
        rest -= minute * 60;
        const second = Math.floor(rest)
        return `${day ? day + 'd ' : ''}${hour ? hour + 'h ' : ''}${minute ? minute + 'm ' : ''}${second}s`
    }
    else {
        return 'It\'s not running'
    }
}

const Server = (props, ref) => {
    const [moduleName, setModuleName] = useState(null)
    const [listDetail, setListDetail] = useState({ loading: false, data: [], select: null })
    const [state, setState] = useState({ visible: false, loading: false, type: 0 })
    const [moduleList, setModuleList] = useState({ loading: false, data: [] })
    const [vmList, setVmList] = useState({ loading: false, data: [] })
    const [server, setServer] = useState(null)
    const [needUpdate, setNeedUpdate] = useState(0)

    const gref = useRef()

    const doServerSelect = async (server_name) => {
        if (!server_name) {
            setServer(null)
            return
        }
        try {
            let server = await get_server(server_name)
            server.current_time = (new Date()).valueOf()
            setServer(server)
        }
        catch (e) {
            setServer(null)
        }
    }

    const onServerChange = (server_name) => {
        setListDetail({ ...gref.current.listDetail, select: server_name })
    }

    gref.current = { listDetail, doServerSelect, onServerChange }
    useEffect(() => {
        async function run() {
            let select = gref.current.listDetail.select
            let has_find = false
            setListDetail({ loading: true, data: [], select })
            let data = await get_server_list(moduleName)
            if (moduleName) {
                data.sort((a, b) => { return a.ctime > b.ctime })
                if (select)
                    if (data.find((v) => { return v.name === select })) {
                        has_find = true
                    }
                if (has_find) {
                    gref.current.onServerChange(select)
                    setListDetail({ loading: false, data, select })
                }
                else {
                    setListDetail({ loading: false, data, select: null })
                    setServer(null)
                }
            }
            else {
                let group = {}
                for (let d of data) {
                    if (group[d.mode_name] === undefined) {
                        group[d.mode_name] = []
                    }
                    if (select)
                        if (d.name === select) {
                            has_find = true
                        }
                    group[d.mode_name].push(d)
                }
                if (select) {
                    if (has_find) {
                        setListDetail({ loading: false, group, select })
                        gref.current.onServerChange(select)
                    }
                    else {
                        setListDetail({ loading: false, group, select: null })
                        setServer(null)
                    }
                }
                else {
                    setListDetail({ loading: false, group, select: null })
                    setServer(null)
                }
            }
        }
        run()
    }, [moduleName, needUpdate])

    useEffect(() => {
        async function run() {
            await gref.current.doServerSelect(listDetail.select)
        }
        run()
    }, [listDetail.select])


    const [form] = Form.useForm()
    const onNewClick = useCallback(async () => {
        setState({ visible: true, loading: false, type: 0 })
        setModuleList({ loading: true, data: [] })
        setVmList({ loading: true, data: [] })
        const [vmdata, moduledata] = await Promise.all([get_all_vm(), get_module_list()])
        setModuleList({ loading: false, data: moduledata })
        setVmList({ loading: false, data: vmdata })
        form.setFieldsValue({
            mode_name: moduleName,
            flag_env: 'none'
        })
    }, [form, moduleName])

    useImperativeHandle(ref, () => ({
        new_dialog: onNewClick,
        select: (module, server) => {
            onServerChange(server)
            setModuleName(module)
        },
    }))

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
        setState({ ...state, loading: false, visible: false })
        setTimeout(() => {
            setNeedUpdate(needUpdate + 1)
        }, 500)
    }

    const onModalCancel = async () => {
        setState({ ...state, loading: true, visible: false })
    }

    const StatusRender = () => {
        if (server.status === 1) {
            return (<Badge status='default' text='Init'></Badge>)
        }
        else if (server.status === 3) {
            return (<Badge status='processing' text='Stopping'></Badge>)
        }
        else if (server.status === 4) {
            return (<Badge status='warning' text='Stopped'></Badge>)
        }
        else if (server.status === 5) {
            return (<Badge status='processing' text='Starting'></Badge>)
        }
        else if (server.status === 10) {
            return (<Badge status='success' text='Running'></Badge>)
        }
        else if (server.status === 12) {
            return (<Badge status='processing' text='Restarting'></Badge>)
        }
        else if (server.status === 21) {
            return (<Badge status='default' text='Destroying'></Badge>)
        }
        else if (server.status === 22) {
            return (<Badge status='default' text='Destroyed'></Badge>)
        }
        return (<Badge status='error' text='Unknown'></Badge>)
    }
    const startClick = async (name) => {
        await start_server(name)
        setTimeout(() => {
            setNeedUpdate(needUpdate + 1)
        }, 500)
    }

    const stopClick = async (name) => {
        await stop_server(name)
        setTimeout(() => {
            setNeedUpdate(needUpdate + 1)
        }, 500)
    }

    const restartClick = async (name) => {
        await restart_server(name)
        setTimeout(() => {
            setNeedUpdate(needUpdate + 1)
        }, 500)
    }

    const destroyClick = async (name) => {
        await destroy_server(name)
        setTimeout(() => {
            setNeedUpdate(needUpdate + 1)
        }, 500)
    }

    const OperationButtons = (props) => {
        if (props.server.status === 1) {
            return (<div></div>)
        }
        else if (props.server.status === 4) {
            return (
                <Row gutter={[8, 8]}>
                    <Col>
                        <Button disabled={props.server.version === null} onClick={() => startClick(props.server.name)} icon={<PoweroffOutlined />} type='primary'>Start</Button>
                    </Col>
                    <Col>
                        <Popconfirm title="Are you sure?" onConfirm={() => destroyClick(props.server.name)} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                            <Button danger icon={<CloseOutlined />}>Destroy</Button>
                        </Popconfirm>
                    </Col>
                </Row>
            )
        }
        else if (props.server.status === 10) {
            return (
                <Row gutter={[8, 8]}>
                    <Col>
                        <Button disabled={props.server.version === null} onClick={() => restartClick(props.server.name)}>Restart</Button>
                    </Col>
                    <Col>
                        <Button danger onClick={() => stopClick(props.server.name)} icon={<PoweroffOutlined />}>Stop</Button>
                    </Col>
                </Row>
            )
        }
        else if (props.server.status !== 22) {
            return (
                <Row gutter={[8, 8]}>
                    <Col>
                        <Popconfirm title="Are you sure?" onConfirm={() => destroyClick(props.server.name)} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                            <Button danger icon={<CloseOutlined />}>Destroy</Button>
                        </Popconfirm>
                    </Col>
                </Row>
            )
        }
        else {
            return ''
        }
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
                <Select style={{ minWidth: '220px' }} onChange={onServerChange} value={listDetail.select}>
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
                <Select style={{ minWidth: '220px' }} onChange={onServerChange} value={listDetail.select}>
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

    const RunningTime = (props) => {
        const [serverDetailTime, setServerDetailTime] = useState(
            props.server && props.server.status === 10 ? Math.floor(((new Date()).valueOf() - server.start_time) / 1000) : null)
        useInterval(() => {
            if (props.server && serverDetailTime !== null) {
                setServerDetailTime(serverDetailTime + 1)
            }
            else {
                setServerDetailTime(null)
            }
        }, 1000)

        return <span>
            {getServerRunningTime(serverDetailTime)}
        </span>

    }

    const ServerVersion = withRouter((props) => {
        if (props.version) {
            return (
                <Button type='link' onClick={() => props.history.push({ pathname: '/deploy/detail', search: '?id=' + props.deploy_id })}>{props.version}</Button>
            )
        }
        else {
            return ('None')
        }
    })

    const ServerDashboardInner = ({ server, history }) => {
        const goVM = (vm) => {
            history.push({ pathname: '/vm', search: '?name=' + encodeURIComponent(vm) })
        }

        const goModule = (module) => {
            history.push({ pathname: '/module', search: '?name=' + encodeURIComponent(module) })
        }

        const goMonitor = (name) => {
            history.push({ pathname: '/monitor', search: '?server=' + encodeURIComponent(name) })
        }
        return (
            <Row gutter={8} style={{ marginTop: 30 }}>
                <Col span={16}>
                    <Card title={'Information of ' + server.name}>
                        <Row gutter={[32, 32]}>
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
                                {moment(server.ctime).format('lll')}
                            </Col>
                            <Col span={8}>
                                <Typography.Title level={4}>
                                    VM:
                                </Typography.Title>
                                <Button type='link' onClick={() => goVM(server.vm_name)}>
                                    {server.vm_name}
                                </Button>
                            </Col>
                            <Col span={8}>
                                <Typography.Title level={4}>
                                    Module:
                                </Typography.Title>
                                <Button type='link' onClick={() => goModule(server.mode_name)}>
                                    {server.mode_name}
                                </Button>
                            </Col>
                            <Col span={8}>
                                <Typography.Title level={4}>
                                    Running Time:
                                </Typography.Title>
                                <RunningTime server={server}></RunningTime>
                            </Col>
                            <Col span={8}>
                                <Typography.Title level={4}>
                                    Version:
                                </Typography.Title>
                                <ServerVersion deploy_id={server.deploy_id} version={server.version} />
                            </Col>
                            <Col span={8}>
                                <Typography.Title level={4}>
                                    Monitor:
                                </Typography.Title>
                                <Button type='link' onClick={() => goMonitor(server.name)}>
                                    Go
                                </Button>
                            </Col>
                            <Col span={8}>
                                <Typography.Title level={4}>
                                    Restart Count:
                                </Typography.Title>
                                {server.restart_count ? (<span style={{color: '#f0305a', fontWeight: 'bold'}}>{server.restart_count}</span>) : server.restart_count}
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col span={8}>
                    <Card title='Operation'>
                        <OperationButtons server={server}>

                        </OperationButtons>
                    </Card>
                </Col>
            </Row>
        )
    }
    const ServerDashboard = withRouter(ServerDashboardInner)

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
                    <ServerDashboard server={server} />
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
                        <Input disabled={state.type !== 0} />
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
                            <Select.Option value='none' key='none'>Normal</Select.Option>
                            <Select.Option value='test' key='test'>Test</Select.Option>
                            <Select.Option value='gray' key='gray'>Gray</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>

            </Modal>
        </div>
    )
}

export default React.forwardRef(Server)
