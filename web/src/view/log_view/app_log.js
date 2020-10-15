import React, { useState, useEffect } from 'react'
import { Row, Col, Tooltip, Input, InputNumber, Form, Table, Select, Divider, DatePicker, Button, Typography, Tag } from 'antd'
import { SearchOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { get_module_list } from '../../api/module'
import { get_server_list } from '../../api/server'
import { query_log } from '../../api/log'
import moment from 'moment'

const TagRender = (props) => {
    if (props.level === 'error') {
        return (<Tag color='error'>{props.level}</Tag>)
    }
    else if (props.level === 'info') {
        return (<Tag color='processing'>{props.level}</Tag>)
    }
    else if (props.level === 'warning') {
        return (<Tag color='warning'>{props.level}</Tag>)
    }
    else if (props.level) {
        return (<Tag>{props.level}</Tag>)
    }
    else {
        return null
    }
}

const AppLog = (props) => {
    const [serverList, setServerList] = useState([])
    const [moduleList, setModuleList] = useState([])
    const [query, setQuery] = useState(null)
    const [pagination, setPagination] = useState({ total: 0, current: 1, pageSize: 20, showTotal: (v) => `Total ${v}` })
    const [logList, setLogList] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        async function run() {
            setModuleList(await get_module_list())
        }
        run()
    }, [])
    const [form] = Form.useForm()
    useEffect(() => {
        async function run() {
            setServerList(await get_server_list())
        }
        run()
    }, [])

    const onSelectModule = async (module_name) => {
        setServerList(await get_server_list(module_name))
        form.setFieldsValue({ server: '' })
    }

    const handleTableChange = (pagination, filters, sorter) => {
        setPagination({ ...pagination })
    }

    useEffect(() => {
        async function run() {
            setLoading(true)
            try {
                const [list, total] = await query_log({ ...query, page: pagination.current - 1, size: pagination.pageSize })
                setLogList(list)
                setPagination(v => { return { ...v, total } })
            }
            finally {
                setLoading(false)
            }
        }
        if (query)
            run()
    }, [query, pagination.current, pagination.pageSize])

    const onFinish = async (val) => {
        let query = {}
        if (val.vid !== undefined && val.vid !== null)
            query.vid = val.vid

        if (val.tid)
            query.tid = val.tid

        if (val.time) {
            if (val.time[0])
                query.time_start = new Date(val.time[0]).valueOf()
            if (val.time[1])
                query.time_end = new Date(val.time[1]).valueOf()
        }

        if (val.server) {
            query.server = val.server
        }
        if (val.level && val.level.length !== 0) {
            query.level = val.level
        }
        if (val.module) {
            query.module = val.module
        }
        if (val.detail) {
            query.detail = val.detail
        }
        setQuery(query)
    }


    const columns = [
        {
            title: 'Vid',
            dataIndex: 1,
            key: 1,
            render: vid => (<Typography.Text>{vid}</Typography.Text>)
        },
        {
            title: 'Track id',
            dataIndex: 3,
            key: 3,
            render: tid => (<Typography.Text>{tid}</Typography.Text>)
        },
        {
            title: 'Level',
            dataIndex: 5,
            key: 5,
            render: level => (<TagRender level={level}></TagRender>)
        },
        {
            title: 'Time',
            dataIndex: 2,
            key: 2,
            render: timestamp => (<span>
                <Tooltip title={
                    <Typography.Text copyable>{timestamp}</Typography.Text>
                }>{moment(timestamp).format('lll')}</Tooltip></span>)
        },
        {
            title: 'Server',
            dataIndex: 4,
            key: 4,
        },
        {
            title: 'Detail',
            dataIndex: 6,
            key: 6,
            ellipsis: true,
            render: detail => (<span>{detail}</span>)
        }
    ]

    return (
        <div>
            <Form onFinish={onFinish} form={form}>
                <Row gutter={[12, 12]}>
                    <Col >
                        <Form.Item label='VID' name='vid'>
                            <InputNumber maxLength={24}></InputNumber>
                        </Form.Item>
                    </Col>
                    <Col >
                        <Form.Item label='TrackId' name='tid'>
                            <Input></Input>
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item label='Module' name='module'>
                            <Select allowClear style={{ minWidth: 200 }} onChange={onSelectModule}>
                                {moduleList.map(v => (<Select.Option key={v.name}>{v.name}</Select.Option>))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item label='Server' name='server'>
                            <Select allowClear style={{ minWidth: 200 }}>
                                {serverList.map(v => (<Select.Option key={v.name}>{v.name}</Select.Option>))}
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item label='Time range' name='time'>
                            <DatePicker.RangePicker showTime allowEmpty={[true, true]} format="YYYY-MM-DD HH:mm:ss" />
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item label='Log level' name='level'>
                            <Select mode='tags' style={{ minWidth: 200 }}>
                                {
                                    ['error', 'warning', 'info', 'debug'].map(v => (
                                        <Select.Option key={v} value={v}>{v}</Select.Option>
                                    ))
                                }
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item name='detail' label={<span>Log text search&nbsp;
                                                    <Tooltip title={'Use query string by mongodb.'}><QuestionCircleOutlined /></Tooltip>
                        </span>
                        }>
                            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }}></Input.TextArea>
                        </Form.Item>
                    </Col>
                </Row>
                <Button type='primary' icon={<SearchOutlined />} loading={loading} htmlType='submit'>Query</Button>
            </Form>
            <Divider />
            <Table fixedHeader expandable={{
                expandedRowRender: record => <Typography.Text copyable>{record[6]}</Typography.Text>,
                rowExpandable: () => { return true; },
            }}
                pagination={pagination}
                onChange={handleTableChange}
                style={{ width: '100%' }}
                rowKey={0} dataSource={logList} loading={loading} columns={columns}>
            </Table>
        </div >
    )
}

export default AppLog
