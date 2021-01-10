import React, { useState, useEffect, useRef } from 'react'
import { Button, Popconfirm, Row, Select, Input, Form, Modal, message, Col, Card, Typography, Progress, Dropdown, Menu } from 'antd'
import { QuestionCircleOutlined, EditOutlined, DeleteOutlined, EllipsisOutlined, CloudServerOutlined, ForkOutlined, CodeSandboxOutlined } from '@ant-design/icons'
import { add_module, get_module_list, update_module, delete_module, get_module } from '../../api/module'
import { user_list } from '../../api/user'
import Server from '../server/server'
import JobSelect from '../components/job_select'
import moment from 'moment'
import { withRouter } from 'react-router'
import queryString from 'query-string'

const { Option } = Select

const Module = (props) => {
    const [state, setState] = useState({ visible: false, type: 0, loading: false, need_update: 0 })
    const [data, setData] = useState([])
    const [userlistData, setUserlistData] = useState([])
    const initJobList = { env: [], source: [], build: [], deploy: [] }
    const [joblist, setJoblist] = useState(initJobList)
    const [detail, setDetail] = useState({ show: false, name: null })
    const ref = useRef()

    const addModule = async () => {
        setJoblist(initJobList)
        form.setFieldsValue({
            name: '',
            dev_user: '',
            display_name: '',
            desc: '', 
        })
        setState({ ...state, visible: true, type: 0, loading: false })
        setUserlistData(await user_list())
    }

    const [form] = Form.useForm()

    const onModalOk = async () => {
        setState({ ...state, loading: true })
        let val
        try {
            val = await form.validateFields()
            if (!(joblist.env.length > 0 && joblist.source.length > 0 && joblist.build.length && joblist.deploy.length)) {
                message.error('Please set jobs')
                return
            }
        }
        catch (e) {
            setState({ ...state, loading: false })
            return
        }
        val.jobs = joblist
        if (state.type === 0) {
            await add_module(val)
            // ok
            message.info('Create module done!')
            setState({ ...state, loading: false, visible: false, need_update: state.need_update + 1 })
        }
        else {
            await update_module(val)
            // ok
            message.info('Update module done!')
            setState({ ...state, loading: false, visible: false, need_update: state.need_update + 1 })
        }
    }
    const onModalCancel = () => {
        setState({ ...state, visible: false })
    }

    const editClick = async (e) => {
        const mode = await get_module(e.name)
        form.setFieldsValue({
            name: mode.name,
            dev_user: mode.dev_user,
            desc: mode.desc,
            display_name: mode.display_name,
        })
        setState({ ...state, visible: true, type: 1, loading: false })
        setJoblist(mode.jobs)
        setUserlistData(await user_list())
    }

    const onChange = (e) => {
        setJoblist(e)
    }

    const detailServerClick = (name, server_name) => {
        ref.current.select(name, server_name)
        setDetail({ show: true, name })
    }

    const deleteClick = async (e) => {
        try {
            await delete_module(e.name)
        }
        catch (e) {
        }
        setState({ ...state, need_update: state.need_update + 1 })
    }

    useEffect(() => {
        async function run() {
            const list = await get_module_list()
            setData(list)
        }
        run()
    }, [state.need_update])

    const module_name = queryString.parse(props.location.search).name

    const cardClick = (v) => {

    }

    const onFork = (module) => {

    }

    const ButtonLinkPipeline = (props) => {
        if (props.module.pipeline_id) {
            return (
                <Button type='link'>#{props.module.pipeline_id} {moment(props.module.pipeline_time).fromNow()}</Button>
            )
        }
        else {
            return (
                <span>Never running</span>
            )
        }
    }

    const ServerMenu = (props) => {
        if (props.module.servers.length > 0) {
            return (<Menu {...props}>
                {
                    props.module.servers.map(server => (
                        <Menu.Item key={server} onClick={() => detailServerClick(props.module.name, server)}>
                            {server}
                        </Menu.Item>
                    ))
                }
                <Menu.Divider>
                </Menu.Divider>
                <Menu.Item icon={<CloudServerOutlined />} onClick={() => detailServerClick(props.module.name, null)}>
                    All Servers
                </Menu.Item>
            </Menu>)
        }
        else {
            return (
                <Menu {...props}>
                    <Menu.Item icon={<DeleteOutlined />}>
                        <Popconfirm title="Are you sure?" onConfirm={() => deleteClick(props.module)} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                            Delete this module
                        </Popconfirm>
                    </Menu.Item>
                    <Menu.Divider>
                    </Menu.Divider>
                    <Menu.Item icon={<CloudServerOutlined />} onClick={() => detailServerClick(props.module.name, null)}>
                        All Servers
                    </Menu.Item>
                </Menu>
            )
        }
    }

    return (
        <div className='page'>
            <Row>
                <Col>
                    <Button type='primary' onClick={addModule}>Add</Button>
                </Col>
            </Row>
            <div style={{ textAlign: 'left' }}>
                {
                    data.map(v => (
                        <div className='card' key={v.name} style={{ margin: '20px 20px 0 0', display: 'inline-block' }}>
                            <Card className={{ 'item_blink': module_name === v.name, 'card_normal': true }} size='small' key={v.name} onClick={() => { cardClick(v) }}
                                style={{ maxWidth: 300, width: 300 }}
                                title={v.display_name}
                                actions={[<EditOutlined key="editing" onClick={() => editClick(v)} />,
                                <div><Dropdown trigger={['click']} overlay={<ServerMenu module={v} />}>
                                    <span style={{ display: 'inline-block' }} className='full_fill'><CloudServerOutlined /> {v.num}</span>
                                </Dropdown></div>,
                                <div><Dropdown trigger={['click']} overlay={(<Menu>
                                    <Menu.Item icon={<ForkOutlined />} onClick={() => onFork(v)}>
                                        Fork
                                    </Menu.Item>
                                    <Menu.Item icon={<CodeSandboxOutlined />} >
                                        Web trigger
                                    </Menu.Item>
                                </Menu>)}><EllipsisOutlined className='full_fill' /></Dropdown></div>,
                                ]}
                            >
                                <div>
                                    <Typography.Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }} style={{ width: '100%', marginBottom: 0 }}>
                                        {v.desc}
                                    </Typography.Paragraph>
                                    <div style={{ textAlign: 'center', marginTop: 10 }}>
                                        <ButtonLinkPipeline module={v} />
                                        <Progress />
                                    </div>
                                </div>
                            </Card >
                        </div>
                    ))
                }
            </div>
            <Modal
                visible={detail.show}
                title='All Servers'
                footer={null}
                width='80%'
                centered
                forceRender
                onCancel={() => setDetail({ show: false, name: null })}
            >

                <Server ref={ref} />
            </Modal>
            <Modal
                visible={state.visible}
                title='Create/Edit Module'
                okText='Save'
                cancelText='Cancel'
                onOk={onModalOk}
                onCancel={onModalCancel}
                confirmLoading={state.loading}
                centered
                width='80%'
            >
                <Form form={form}>
                    <Form.Item label='Name' name='name' rules={[{ required: true, message: 'Please input name' }]}>
                        <Input disabled={state.type !== 0} />
                    </Form.Item>
                    <Form.Item label='Display name' name='display_name' rules={[{ required: true, message: 'Please input display name' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label='Description' name='desc' rules={[{ required: true, message: 'Please input description' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label='User' name='dev_user' rules={[{ required: true, message: 'Please select dev user' }]}>
                        <Select>
                            {userlistData && userlistData.map(v => (
                                <Option key={v.username} value={v.username}>{v.username}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label='Pipeline jobs' name='pipeline'>
                        <JobSelect editable={state.type === 0} joblist={joblist} onJobChange={onChange}></JobSelect>
                    </Form.Item>
                </Form>

            </Modal>
        </div>
    )
}

export default withRouter(Module)
