import React, { useState, useEffect, Fragment, useRef } from 'react'
import { Table, Typography, Tag, Button, Popconfirm, Modal, Row, Col, Form, Select, Input, Tooltip } from 'antd'
import { get_pipelines, delete_pipeline, create_pipeline } from './../../api/pipeline'
import { withRouter } from 'react-router-dom'
import { get_module_list, get_module } from '../../api/module'
import queryString from 'query-string'
import { get_all_vm } from '../../api/vm'
import { get_server_list } from '../../api/server'
import { QuestionCircleOutlined, SyncOutlined, CloseCircleOutlined, CheckCircleOutlined, LinkOutlined, FundViewOutlined, DeleteOutlined } from '@ant-design/icons'
import ScriptSelect from './../components/script_select'
import moment from 'moment'

const RenderStage = (props) => {
    if (props.stage === 1) {
        return <Tag color='processing' icon={<SyncOutlined spin />}>Prepare</Tag>
    }
    else if (props.stage === 2) {
        return <Tag color='processing' icon={<SyncOutlined spin />}>Source</Tag>
    }
    else if (props.stage === 3) {
        return <Tag color='processing' icon={<SyncOutlined spin />}>Build</Tag>
    }
    else if (props.stage === 4) {
        return <Tag color='processing' icon={<SyncOutlined spin />}>Deploy</Tag>
    }
    else if (props.stage === 100) {
        return <Tag color='success' icon={<CheckCircleOutlined />}>Done</Tag>
    }
    else {
        return <Tag color='error' icon={<CloseCircleOutlined />}>Error</Tag>
    }
}


const PipeLineList = props => {
    const goClick = (id) => {
        props.history.push({ pathname: '/pipeline/detail', search: '?id=' + id })
    }
    const [isDel, setIsDel] = useState(false)
    const [data, setData] = useState([])
    const [pagination, setPagination] = useState({ total: 0, current: 1, pageSize: 10 })
    const [loading, setLoading] = useState(false)
    const [needUpdate, setNeedUpdate] = useState(0)

    const deleteClick = async (id) => {
        setIsDel(true)
        await delete_pipeline(id)
        setIsDel(false)
        setNeedUpdate(needUpdate + 1)
    }
    const goDeployClick = (id) => {
        props.history.push({ pathname: '/deploy/detail', search: '?id=' + id })
    }

    const goModule = (module) => {
        props.history.push({ pathname: '/module', search: '?name=' + encodeURIComponent(module) })
    }

    const columns = [
        {
            title: 'id',
            dataIndex: 'id',
            key: 'id',
            render: (id, r) => (
                <Button type='link' onClick={() => goClick(id)}>
                    {id}
                </Button>
            )
        },
        {
            title: 'module',
            dataIndex: 'mode_name',
            key: 'module',
            render: text => <Button type='link' onClick={() => goModule(text)}>{text}</Button>
        },
        {
            title: 'Status',
            dataIndex: 'stage',
            key: 'stage',
            render: text => <RenderStage stage={text} />
        },
        {
            title: 'Create time',
            dataIndex: 'ctime',
            key: 'ctime',
            render: text => <span>{moment(text).format('lll')}</span>
        },
        {
            title: 'Mark',
            dataIndex: 'mark',
            key: 'mark',
            render: text => <Typography.Text ellipsis>{text}</Typography.Text>
        },
        {
            title: 'Operation',
            dataIndex: 'id',
            key: 'id',
            render: (id, r) => (<Row gutter={[8, 8]}> <Col>
                <Popconfirm title="Are you sure？" onConfirm={() => deleteClick(id)} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                    <Button danger type='link' icon={<DeleteOutlined />} loading={isDel}>Delete</Button></Popconfirm>
            </Col>
                <Col>
                    <Button type='link' icon={<FundViewOutlined />} onClick={() => goClick(id)} >View Detail</Button>
                </Col>
                {
                    r.deploy_id &&
                    (
                        <Col>
                            <Button type='link' icon={<LinkOutlined />} onClick={() => goDeployClick(r.deploy_id)} >Go Deploy</Button>
                        </Col>
                    )
                }
            </Row>
            )
        }
    ]

    const handleTableChange = (pagination, filters, sorter) => {
        setPagination({ ...pagination })
        setNeedUpdate(needUpdate + 1)
    }

    const ref = useRef()
    ref.current = pagination

    useEffect(() => {
        async function run() {
            setLoading(true)
            const pagination = ref.current
            const [list, total] = await get_pipelines(pagination.current - 1, pagination.pageSize)
            setData(list)
            setPagination(v => { return { ...v, total } })
            setLoading(false)
        }
        run()
    }, [needUpdate])

    const [form] = Form.useForm()
    const [moduleList, setModuleList] = useState({ loading: false, list: [] })
    const [state, setState] = useState({ loading: false, visible: false })
    const [scriptName, setScriptName] = useState(null)

    const addClick = async () => {
        setState({ loading: false, visible: true })
        setModuleList({ loading: true, list: [] })
        const list = await get_module_list()
        setModuleList({ loading: false, list })
    }
    useEffect(() => {
        if (queryString.parse(props.location.search).new) {
            setTimeout(() => addClick())
        }
    }, [props.location.search])


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

        for (let f of Object.entries(val)) {
            if (f[1] === undefined) {
                val[f[0]] = ''
            }
        }
        const {id} = await create_pipeline(val)
        setState({ loading: false, visible: false })
        setNeedUpdate(needUpdate + 1)
        goClick(id)
    }

    const onModalCancel = async () => {
        setState({ loading: false, visible: false })
    }

    const [createData, setCreateData] = useState(null)
    const [createLoading, setCreateLoading] = useState(false)
    const [serverList, setServerList] = useState([])
    const [vmList, setVmList] = useState([])

    const fillDefaults = (p, obj) => {
        for (const it of p) {
            let f = {}
            for (const ot of it.param) {
                if (ot.default !== undefined && ot.default !== null)
                    f[ot.name] = ot.default
            }
            if (f !== {})
                obj[it.name] = f
        }
    }

    const onModuleSelect = async (name) => {
        setCreateLoading(true)
        try {
            const [module_data, vm_list, server_list] = await (Promise.all([
                get_module(name), get_all_vm(), get_server_list()]
            ))
            setCreateData(module_data.pipeline_params)
            setVmList(vm_list)
            setServerList(server_list)
            let obj = {}
            fillDefaults(module_data.pipeline_params.env, obj)
            fillDefaults(module_data.pipeline_params.source, obj)
            fillDefaults(module_data.pipeline_params.build, obj)
            fillDefaults(module_data.pipeline_params.deploy, obj)
            form.setFieldsValue({ param: obj })
        }
        catch (e) {
        }
        finally {
            setCreateLoading(false)
        }
    }

    const [select, setSelect] = useState({ visible: false })

    const onSearch = (name, param_names) => {
        let data = form.getFieldValue(param_names)
        setScriptName(data)
        setSelect({ visible: true, name, param_names })
    }

    const onCancel = () => {
        setSelect({ ...select, visible: false })
    }


    const onSelect = (script) => {
        setSelect({ ...select, visible: false })
        form.setFields([{ name: select.param_names, value: script }])
    }

    const ItemRender = (list) => {
        return (
            list.map(l => {
                if (l.param.length > 0) return (
                    <Form.Item key={l.name} className='pipeline_form_item'>
                        <div>
                            <span className='form_items_label'>
                                <Tag color='#108ee9'>
                                    {l.name}
                                </Tag>
                            </span>
                            <div className='form_items pipeline'>
                                {
                                    l.param.map(p => {
                                        if (p.type === 'string') {
                                            return (
                                                <Form.Item key={p.name} name={['param', l.name, p.name]} label={
                                                    <span>{p.label} &nbsp;
                                                    <Tooltip title={p.description}><QuestionCircleOutlined /></Tooltip>
                                                    </span>
                                                }>
                                                    <Input></Input>
                                                </Form.Item>
                                            )
                                        }
                                        else if (p.type === 'text') {
                                            return (
                                                <Form.Item key={p.name} name={['param', l.name, p.name]} label={
                                                    <span>{p.label} &nbsp;
                                                    <Tooltip title={p.description}><QuestionCircleOutlined /></Tooltip>
                                                    </span>
                                                }>
                                                    <Input.TextArea autoSize={{ minRows: 2, maxRows: 10 }}></Input.TextArea>
                                                </Form.Item>
                                            )
                                        }
                                        else if (p.type === 'script') {
                                            return (
                                                <Form.Item key={p.name} name={['param', l.name, p.name]} label={
                                                    <span>{p.label} &nbsp;
                                                    <Tooltip title={p.description}><QuestionCircleOutlined /></Tooltip>
                                                    </span>
                                                }>
                                                    <Input.Search enterButton='Select' name={p.name} onSearch={() => onSearch(p.label, ['param', l.name, p.name])} />
                                                </Form.Item>
                                            )
                                        }
                                        else if (p.type === 'select VM') {
                                            return (
                                                <Form.Item key={p.name} name={['param', l.name, p.name]} label={
                                                    <span>{p.label} &nbsp;
                                                    <Tooltip title={p.description}><QuestionCircleOutlined /></Tooltip>
                                                    </span>
                                                }>
                                                    <Select style={{ minWidth: 200, textAlign: 'left' }}>
                                                        {vmList.map(v => (<Select.Option key={v.name}>{v.name}</Select.Option>))}
                                                    </Select>
                                                </Form.Item>
                                            )
                                        }
                                        else if (p.type === 'select Server') {
                                            return (
                                                <Form.Item key={p.name} name={['param', l.name, p.name]} label={
                                                    <span>{p.label} &nbsp;
                                                    <Tooltip title={p.description}><QuestionCircleOutlined /></Tooltip>
                                                    </span>
                                                }>
                                                    <Select style={{ minWidth: 200, textAlign: 'left' }}>
                                                        {serverList.map(v => (<Select.Option key={v.name}>{v.name}</Select.Option>))}
                                                    </Select>
                                                </Form.Item>
                                            )
                                        }
                                        else {
                                            return (<div key={p.name}>unknown </div>)
                                        }
                                    })
                                }
                            </div>
                        </div>
                    </Form.Item >
                )
                else return null
            }
            ))
    }

    return (
        <div className='page'>
            <Row><Col>
                <Button onClick={addClick} type='primary'>New ...</Button></Col> </Row>
            <Table loading={loading} rowKey='id' onChange={handleTableChange} dataSource={data} pagination={pagination} columns={columns}>
            </Table>
            <Modal
                visible={state.visible}
                title='Select module to execute pipeline'
                okText='Create'
                cancelText='Cancel'
                onOk={onModalOk}
                onCancel={onModalCancel}
                confirmLoading={state.loading || createLoading}
                centered
            >
                <Form form={form}>
                    <Form.Item label='Module name' name='mode_name' rules={[{ required: true, message: 'Please input module name' }]}>
                        <Select onSelect={onModuleSelect} style={{ minWidth: 200, textAlign: 'left' }}>
                            {moduleList.list.map(v => (<Select.Option key={v.name}>{v.name}</Select.Option>))}
                        </Select>
                    </Form.Item>
                    {
                        createData && (
                            <Fragment>
                                {ItemRender(createData.env)}
                                {ItemRender(createData.source)}
                                {ItemRender(createData.build)}
                                {ItemRender(createData.deploy)}
                            </Fragment>
                        )
                    }
                    <Form.Item label='Mark' name='mark'>
                        <Input.TextArea autoSize={{ minRows: 5, maxRows: 20 }}></Input.TextArea>
                    </Form.Item>
                </Form>
            </Modal>
            <ScriptSelect title={'Select ' + select.name} script={scriptName} visible={select.visible} onCancel={onCancel} onSelect={onSelect} />
        </div>
    )
}

export default withRouter(PipeLineList)
