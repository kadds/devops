import React, { useState, useEffect } from 'react'
import { Row, Col, Tooltip, Input, InputNumber, Form, Table, Select, Divider, DatePicker, Button, Typography, Tag } from 'antd'
import { SearchOutlined, QuestionCircleOutlined } from '@ant-design/icons'
import { get_module_list } from '../../api/module'
import { get_server_list } from '../../api/server'
import { query_log } from '../../api/log'

const LogView = (props) => {
    const [serverList, setServerList] = useState([])
    const [moduleList, setModuleList] = useState([])
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

    const [logList, setLogList] = useState({ loading: false, list: [], count: 0 })

    const onFinish = async (val) => {
        setLogList({ loading: true, list: [], count: 0 })
        try {
            let query = {}
            if (val.vid)
                query.vid = parseInt(val.vid)

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

            const { list, count } = await query_log(query)
            setLogList({ loading: false, list, count })
        }
        catch (e) {
            console.log(e)
            setLogList({ loading: false, list: [], count: 0 })
            return
        }
    }
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

    const columns = [
        {
            title: 'vid',
            dataIndex: 'vid',
            key: 'vid',
            render: vid => (<Typography.Text>{vid}</Typography.Text>)
        },
        {
            title: 'track id',
            dataIndex: 'tid',
            key: 'tid',
            render: tid => (<Typography.Text>{tid}</Typography.Text>)
        },
        {
            title: 'level',
            dataIndex: 'level',
            key: 'level',
            render: level => (<TagRender level={level}></TagRender>)
        },
        {
            title: 'time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: timestamp => (<span>
                <Tooltip title={
                    <Typography.Text copyable>{timestamp}</Typography.Text>
                }>{new Date(timestamp).toLocaleString()}</Tooltip></span>)
        },
        {
            title: 'server',
            dataIndex: 'server',
            key: 'server',
        },
        {
            title: 'detail',
            dataIndex: 'detail',
            key: 'detail',
            ellipsis: true,
            render: detail => (<span>{detail}</span>)
        }
    ]

    return (
        <div className='page'>
            <Form onFinish={onFinish} form={form} wrapperCol={{ span: 16 }} labelCol={{ span: 8 }} layout='inline'>
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
                        : &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</span>
                        }>
                            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }}></Input.TextArea>
                        </Form.Item>
                    </Col>
                </Row>
                <Button type='primary' icon={<SearchOutlined />} loading={logList.loading} htmlType='submit'>Query</Button>
            </Form>
            <Divider />
            <Table fixedHeader expandable={{
                expandedRowRender: record => <Typography.Text copyable>{record.detail}</Typography.Text>,
                rowExpandable: () => { return true; },
            }}
                style={{ width: '100%' }} title={() => (<Typography.Text>{'Full query record ' + logList.count}</Typography.Text>)} rowKey='_id' dataSource={logList.list} columns={columns}>

            </Table>
        </div >
    )
}

export default LogView
