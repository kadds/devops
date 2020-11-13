import React, { useState, useEffect } from 'react'
import { Button, Popconfirm, Row, Select, Table, Input, Form, Modal, message, Col } from 'antd'
import { QuestionCircleOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
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
    const [editLoading, setEditLoading] = useState(false)

    const addModule = async () => {
        setJoblist(initJobList)
        form.setFieldsValue({
            name: '',
            dev_user: '',
            res_port: ''
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
        setEditLoading(true)
        try {
            const mode = await get_module(e.name)
            form.setFieldsValue({
                name: mode.name,
                dev_user: mode.dev_user,
            })
            setState({ ...state, visible: true, type: 1, loading: false })
            setJoblist(mode.jobs)
            setUserlistData(await user_list())
        }
        catch (e) {
        }
        finally {
            setEditLoading(false)
        }
    }

    const onChange = (e) => {
        setJoblist(e)
    }

    const detailClick = (name) => {
        setDetail({ show: true, name })
    }

    const [isDel, setIsDel] = useState(false)
    const deleteClick = async (e) => {
        setIsDel(true)
        try {
            await delete_module(e.name)
        }
        catch (e) {
        }
        setIsDel(false)
        setState({ ...state, need_update: state.need_update + 1 })
    }

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: text => <Button type="link" onClick={() => detailClick(text)}>{text}</Button>
        },
        {
            title: 'User',
            dataIndex: 'dev_user',
            key: 'dev_user',
            render: text => <span>{text}</span>
        },
        {
            title: 'Server count',
            dataIndex: 'num',
            key: 'num',
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
                    <Button type='link' loading={editLoading} disabled={isDel} icon={<EditOutlined />} onClick={() => editClick(r)}>Edit</Button>
                </Col>
                <Col>
                    <Popconfirm title="Are you sure?" onConfirm={() => deleteClick(r)} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                        <Button type='link' danger icon={<DeleteOutlined />} loading={isDel}>Delete</Button>
                    </Popconfirm>
                </Col> </Row>)
        }
    ]

    useEffect(() => {
        async function run() {
            const list = await get_module_list()
            setData(list)
        }
        run()
    }, [state.need_update])

    const module_name = queryString.parse(props.location.search).name

    return (
        <div className='page'>
            <Row gutter={20}>
                <Col flex={'1 1 50%'}>
                    <div style={{ textAlign: 'left' }}>
                        <Button type='primary' onClick={addModule}>Add</Button>
                    </div>
                    <Table rowClassName={(record, index) => {
                        if (record.name === module_name) {
                            return 'table_item_blink'
                        }
                        return 'table_item_noraml'
                    }} pagination={false} rowKey={'name'} dataSource={data} columns={columns}></Table>
                </Col>
                {
                    detail.show && (<Col flex={'1 1 50%'}>
                        <Server mode_name={detail.name}> </Server>
                    </Col>)
                }
            </Row>
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
