import React, { useState } from 'react'
import { Form, Tooltip, Row, Col, Typography, Table, Divider, InputNumber, Button, DatePicker } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { click_query } from './../../api/log'
import moment from 'moment'

const ClickLog = () => {
    const [logList, setLogList] = useState({ loading: false, list: [], count: 0 })
    const [form] = Form.useForm()

    const onFinish = async (v) => {
        setLogList({ ...logList, loading: true })
        try {
            const { list, count } = await click_query(v)
            setLogList({ loading: false, list, count })
        }
        catch (e) {
            setLogList({ ...logList, loading: false })
            return
        }
    }

    const columns = [
        {
            title: 'Track id',
            dataIndex: 'tid',
            key: 'tid',
            render: tid => (<Typography.Text>{tid}</Typography.Text>)
        },
        {
            title: 'Method',
            dataIndex: 'method',
            key: 'level',
            render: method => (<span>{method}</span>)
        },
        {
            title: 'Request Time',
            dataIndex: 'timestamp',
            key: 'timestamp',
            render: timestamp => (<span>
                <Tooltip title={
                    <Typography.Text copyable>{timestamp}</Typography.Text>
                }>{moment(timestamp).format('lll')}</Tooltip></span>)
        },
        {
            title: 'Instance server',
            dataIndex: 'server',
            key: 'server',
        },
        {
            title: 'URL',
            dataIndex: 'url',
            key: 'url',
            ellipsis: true,
            render: text => (<span>{text}</span>)
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
                    <Col>
                        <Form.Item label='Time range' name='time'>
                            <DatePicker.RangePicker showTime allowEmpty={[true, true]} format="YYYY-MM-DD HH:mm:ss" />
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
                style={{ width: '100%' }} title={
                    () =>
                        (<Typography.Text>{'Full query record ' + logList.count}</Typography.Text>)
                }
                rowKey='_id' dataSource={logList.list} columns={columns}>
            </Table>
        </div>
    )
}

export default ClickLog
