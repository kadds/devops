import React, { useState, useEffect, useRef } from 'react'
import { Form, Tooltip, Row, Col, Typography, Table, Divider, InputNumber, Button, DatePicker } from 'antd'
import { SearchOutlined, RadarChartOutlined, } from '@ant-design/icons'
import { click_query } from './../../api/log'
import moment from 'moment'
import { withRouter } from 'react-router'

const ClickLog = (props) => {
    const [query, setQuery] = useState(null)
    const [pagination, setPagination] = useState({ total: 0, current: 1, pageSize: 20, showTotal: (v) => `Total ${v}` })
    const [logList, setLogList] = useState([])
    const [loading, setLoading] = useState(false)
    const [needUpdate, setNeedUpdate] = useState(0)

    const [form] = Form.useForm()
    const ref = useRef()
    ref.current = pagination

    useEffect(() => {
        async function run() {
            setLoading(true)
            try {
                const pagination = ref.current
                const [list, total] = await click_query({ ...query, page: pagination.current - 1, size: pagination.pageSize })
                setLogList(list)
                setPagination(v => { return { ...v, total } })
            }
            finally {
                setLoading(false)
            }
        }
        if (query)
            run()
    }, [query, needUpdate])

    const onFinish = async (val) => {
        let query = {}
        if (val.vid !== undefined && val.vid !== null)
            query.vid = parseInt(val.vid)
        if (val.time) {
            if (val.time[0])
                query.time_start = new Date(val.time[0]).valueOf()
            if (val.time[1])
                query.time_end = new Date(val.time[1]).valueOf()
        }
        setQuery(query)

    }

    const handleTableChange = (pagination, filters, sorter) => {
        setPagination({ ...pagination })
        setNeedUpdate(needUpdate + 1)
    }

    const columns = [
        {
            title: 'Track id',
            dataIndex: 3,
            key: 3,
            render: tid => (<Tooltip title={
                <Button type='link' icon={<RadarChartOutlined />}
                    onClick={() => { props.history.push({ pathname: '/monitor', search: '?tid=' + tid }) }}></Button>
            }><Typography.Text copyable>{tid}</Typography.Text></Tooltip>)
        },
        {
            title: 'URL',
            dataIndex: 7,
            key: 7,
            ellipsis: true,
            render: (url, r) => (<span>
                <Tooltip title={
                    <Typography.Text className='text' copyable>{url}</Typography.Text>
                }>{r[6]} {url}</Tooltip></span>)
        },
        {
            title: 'Host',
            dataIndex: 8,
            key: 8,
        },
        {
            title: 'Instance server',
            dataIndex: 4,
            key: 4,
        },
        {
            title: 'Cost',
            dataIndex: 5,
            key: 5,
        },
        {
            title: 'Request Time',
            dataIndex: 2,
            key: 2,
            render: timestamp => (<span>
                <Tooltip title={
                    <span>
                        <Typography.Text className='text' copyable>{timestamp}</Typography.Text>
                        <br />
                        {moment(timestamp).format('lll')}
                    </span>
                }>{moment(timestamp).format('DD, HH:mm:ss.SSS')}</Tooltip></span>)
        },
        {
            title: 'Return code/length',
            dataIndex: 9,
            key: 9,
            render: (v, r) => (<span>{r[9]}/{r[10]}</span>)
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
                <Button type='primary' icon={<SearchOutlined />} loading={loading} htmlType='submit'>Query</Button>
            </Form>
            <Divider />
            <Table fixedHeader
                pagination={pagination}
                onChange={handleTableChange}
                style={{ width: '100%' }}
                rowKey={0} dataSource={logList} columns={columns} loading={loading}>
            </Table>
        </div>
    )
}

export default withRouter(ClickLog)
