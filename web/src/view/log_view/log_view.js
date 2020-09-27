import React, { useState, useEffect } from 'react'
import { Row, Col, Input, Form, Select, Divider, DatePicker, Button } from 'antd'
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

    const [logList, setLogList] = useState({ loading: false, list: [] })

    const onFinish = async () => {
        let val = null
        setLogList({ loading: true, list: [] })
        try {
            val = await form.validateFields()
            const list = await query_log(val)
            setLogList({ loading: false, list })
        }
        catch (e) {
            setLogList({ loading: false, list: [] })
            return
        }
    }

    return (
        <div className='page'>
            <Form onFinish={onFinish} form={form} wrapperCol={{ span: 16 }} labelCol={{ span: 8 }} layout='inline'>
                <Row gutter={[12, 12]}>
                    <Col >
                        <Form.Item label='VID' name='vid'>
                            <Input maxLength={24}></Input>
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
                        <Form.Item label='Log text' name='text'>
                            <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }}></Input.TextArea>
                        </Form.Item>
                    </Col>
                </Row>
                <Button type='primary' loading={logList.loading} htmlType='submit'>Query</Button>
            </Form>
            <Divider />
        </div>
    )
}

export default LogView
