import React, { useState, useEffect } from 'react'
import { get_deploy, deploy_do_upload, deploy_do_rollback, stop_deploy } from '../../api/deploy'
import { withRouter } from "react-router-dom"
import { Table, Alert, Row, Col, Popconfirm, Tabs, Tag, Divider, Button, Form, Transfer, Progress, InputNumber, Spin, Typography } from 'antd'
import queryString from 'query-string'
import moment from 'moment'

const Detail = (props) => {
    const id = queryString.parse(props.location.search).id
    const [data, setData] = useState({
        loading: false, all_upload: [], upload_targets: [],
        rollback_targets: [], all_rollback: [], op_list: [],
        upload_loading: false, rollback_loading: false, last_time: 0
    })
    const [upload_form] = Form.useForm()
    const [rollback_form] = Form.useForm()
    const [needUpdate, setNeedUpdate] = useState(0)
    const goServer = (name) => {
        props.history.push({ pathname: '/server', search: '?name=' + encodeURIComponent(name) })
    }

    const onStopClick = async (idx) => {
        await stop_deploy(id, idx)
        setNeedUpdate(needUpdate + 1)
    }

    useEffect(() => {
        async function run() {
            setData(data => ({ ...data, loading: true }))
            const dt = await get_deploy(id)
            let last_time = 0
            for (const item of dt.op_list) {
                if (item.status !== 'stop')
                    last_time = Math.max(item.target_time)
            }

            setData({
                loading: false,
                all_upload: dt.all.filter(v => { return v.can_upload })
                    .map(v => { return { key: v.name, title: v.name, is_test: v.is_test } }),
                all_rollback: dt.all.filter(v => { return v.can_rollback })
                    .map(v => { return { key: v.name, title: v.name, is_test: v.is_test } }),
                upload_targets: [],
                rollback_targets: [],
                op_list: dt.op_list,
                all_cnt: dt.all.length,
                done_cnt: dt.op_list.filter(v => { return v.status === 100 }).length,
                is_active: true,
                upload_loading: false,
                rollback_loading: false,
                last_time: last_time
            })
            upload_form.setFieldsValue({ interval: window.localStorage.getItem('upload_interval') || 30 })
            rollback_form.setFieldsValue({ interval: window.localStorage.getItem('rollback_interval') || 10 })
        }
        run()
    }, [needUpdate, id, upload_form, rollback_form])

    const opColumns = [
        {
            title: 'Server',
            dataIndex: 'server',
            key: 'server',
            render: v => (<Button type='link' onClick={() => goServer(v)}>{v}</Button>)
        },
        {
            title: 'Operation',
            dataIndex: 'op',
            key: 'op',
            render: v => { if (v === 0) { return 'Upload' } else { return 'Rollback' } }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: status => {
                if (status === 1) {
                    return (<Tag>Preparing</Tag>)
                }
                else if (status === 2) {
                    return (<Tag color='processing'>Doing</Tag>)
                }
                else if (status === 5) {
                    return (<Tag color='warning'>Stop</Tag>)
                }
                else if (status === 100) {
                    return (<Tag color='success'>Done</Tag>)
                }
                else if (status === -100) {
                    return (<Tag color='error'>Error</Tag>)
                }
                return 'Unknown'
            }
        },
        {
            title: 'Target operation time',
            dataIndex: 'target_time',
            key: 'target_time',
            render: text => (moment(text).format('lll'))
        },
        {
            title: 'Last operation time',
            dataIndex: 'mtime',
            key: 'mtime',
            render: text => (moment(text).format('lll'))
        },
        {
            title: 'Create time',
            dataIndex: 'ctime',
            key: 'ctime',
            render: text => (moment(text).format('lll'))
        },
        {
            title: 'Operation',
            dataIndex: 'id',
            key: 'id',
            render: (cnt, r) => {
                if (r.status === 1) {
                    return (
                        <Popconfirm title='Stop this deployment?' onConfirm={() => onStopClick(r.id)}>
                            <Button type='link' danger>Stop</Button>
                        </Popconfirm>
                    )
                }
                else {
                    return null
                }
            }
        },
    ]

    const onUploadChange = (keys) => {
        setData({ ...data, upload_targets: keys })
    }

    const onRollbackChange = (keys) => {
        setData({ ...data, rollback_targets: keys })
    }

    const onUploadClick = async (v) => {
        setData({ ...data, upload_loading: true })
        try {
            await deploy_do_upload(id, data.upload_targets, v)
        }
        catch (e) {
            setData({ ...data, upload_loading: false })
            return
        }
        setData({ ...data, upload_loading: false })
        setNeedUpdate(needUpdate + 1)
        window.localStorage.setItem('upload_interval', v.interval)
    }

    const onRollbackClick = async (v) => {
        setData({ ...data, rollback_loading: true })
        try {
            await deploy_do_rollback(id, data.rollback_targets, v)
        }
        catch (e) {
            setData({ ...data, rollback_loading: false })
            return
        }
        setData({ ...data, rollback_loading: false })
        setNeedUpdate(needUpdate + 1)
        window.localStorage.setItem('rollback_interval', v.interval)
    }

    return (
        <div className='page'>
            <Tabs defaultActiveKey='0'>
                <Tabs.TabPane tab='Summary' key='0'>
                    <Spin spinning={data.loading}>
                        {
                            data.last_time > 0 && data.last_time > new Date().valueOf() && (
                                <Typography.Title level={5}>
                                    Expected completion time:{moment(data.last_time).fromNow()}
                                </Typography.Title>
                            )
                        }
                        <Progress status={data.is_active ? 'active' : 'exception'} percent={data.done_cnt / data.all_cnt * 100}
                        ></Progress>
                        <Table rowKey='id' dataSource={data.op_list} columns={opColumns}></Table>
                    </Spin>
                </Tabs.TabPane>
                <Tabs.TabPane tab='Upload' key='1'>
                    <Spin spinning={data.loading}>
                        {
                            data.op_list.length === 0 && (
                                <Alert type="warning" style={{ padding: 10, margin: 5 }} showIcon message={'Please upload test server firstly.'} />
                            )
                        }
                        <Transfer
                            style={{ width: '100%', textAlign: 'left' }}
                            titles={['Ready to upload', 'Uploaded']}
                            dataSource={data.all_upload}
                            targetKeys={data.upload_targets}
                            onChange={onUploadChange}
                            render={it => {
                                if (it.is_test) {
                                    return <span>{it.title} -Test</span>
                                }
                                else {
                                    return <span>{it.title}</span>
                                }
                            }}
                            listStyle={{
                                width: 350,
                                height: 400,
                            }}
                        >
                        </Transfer>
                        <Divider />
                        <Form
                            onFinish={onUploadClick}
                            form={upload_form}
                        >
                            <Row gutter={[8, 8]}>
                                <Col>
                                    <Form.Item name='interval' label='Interval (seconds)'>
                                        <InputNumber min={1} max={3600}></InputNumber>
                                    </Form.Item>
                                </Col>
                                <Col>
                                </Col>
                            </Row>
                            <Button disabled={data.upload_targets.length === 0} type='primary'
                                loading={data.upload_loading}
                                htmlType='submit'>Upload {data.upload_targets.length} server(s)</Button>
                        </Form>
                    </Spin>
                </Tabs.TabPane>
                <Tabs.TabPane tab='Rollback' key='2'>
                    <Spin spinning={data.loading}>
                        <Transfer
                            style={{ width: '100%', textAlign: 'left' }}
                            titles={['Ready to rollback', 'Rollbacked']}
                            onChange={onRollbackChange}
                            dataSource={data.all_rollback}
                            targetKeys={data.rollback_targets}
                            render={it => {
                                if (it.is_test) {
                                    return <span>{it.title} -Test</span>
                                }
                                else {
                                    return <span>{it.title}</span>
                                }
                            }}
                            listStyle={{
                                width: 350,
                                height: 400,
                            }}
                        >
                        </Transfer>
                        <Divider />
                        <Form
                            onFinish={onRollbackClick}
                            form={rollback_form}
                        >
                            <Row gutter={[8, 8]}>
                                <Col>
                                    <Form.Item name='interval' label='Interval (seconds)'>
                                        <InputNumber min={1} max={3600}></InputNumber>
                                    </Form.Item>
                                </Col>
                                <Col>
                                </Col>
                            </Row>
                            <Button disabled={data.rollback_targets.length === 0} type='primary'
                                loading={data.rollback_loading}
                                htmlType='submit'>Rollback {data.rollback_targets.length} server(s)</Button>
                        </Form>
                    </Spin>
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}

export default withRouter(Detail)
