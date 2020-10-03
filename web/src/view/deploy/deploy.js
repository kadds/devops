import React, { useState, useEffect, Fragment } from 'react'
import { get_deploy_list, get_deploy, deploy_do_upload, deploy_do_rollback, stop_deploy } from '../../api/deploy'
import { withRouter } from "react-router-dom"
import { Table, Row, Col, Popconfirm, Tabs, Tag, Divider, Button, Form, Transfer, Progress, InputNumber, Spin, Typography } from 'antd'
import queryString from 'query-string'

const TagRender = (props) => {
    if (props.status === 1) {
        return (<Tag>Init</Tag>)
    }
    else if (props.status === 2) {
        return (<Tag color='processing'>Testing</Tag>)
    }
    else if (props.status === 3) {
        return (<Tag color='success'>Tested</Tag>)
    }
    else if (props.status === 4) {
        return (<Tag color='processing'>Graying</Tag>)
    }
    else if (props.status === 5) {
        return (<Tag color='success'>Grayed</Tag>)
    }
    else if (props.status === 100) {
        return (<Tag>Done</Tag>)
    }
    else if (props.status === -99) {
        return (<Tag color='processing'>Rollback</Tag>)
    }
    else if (props.status === -100) {
        return (<Tag color='success'>Rollback Done</Tag>)
    }
    return props.status
}

const Deploy = (props) => {
    const id = queryString.parse(props.location.search).id
    const [needUpdate, setNeedUpdate] = useState(0)
    const [list, setList] = useState({ list: [], loading: false })
    const [data, setData] = useState({
        loading: false, all_upload: [], upload_targets: [],
        rollback_targets: [], all_rollback: [], op_list: [],
        upload_loading: false, rollback_loading: false, last_time: 0
    })
    useEffect(() => {
        async function run() {
            if (!id) {
                setList({ loading: true, list: [] })
                const data = await get_deploy_list()
                setList({ loading: false, list: data })
            }
        }
        run()
    }, [needUpdate, id])

    const [upload_form] = Form.useForm()
    const [rollback_form] = Form.useForm()

    useEffect(() => {
        async function run() {
            if (id) {
                setData({ ...data, loading: true })
                const dt = await get_deploy(id)
                let last_time = 0
                for (const item of dt.op_list) {
                    if (item.status !== 'stop')
                        last_time = Math.max(item.start_time)
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
                    done_cnt: dt.op_list.filter(v => { return v.status === 'done' }).length,
                    is_active: true,
                    upload_loading: false,
                    rollback_loading: false,
                    last_time
                })
                upload_form.setFieldsValue({ interval: window.localStorage.getItem('upload_interval') || 30 })
                rollback_form.setFieldsValue({ interval: window.localStorage.getItem('rollback_interval') || 10 })
            }
        }
        run()
    }, [needUpdate, id])
    const onViewClick = (id) => {
        props.history.push({ pathname: '/deploy', search: '?id=' + id })
        setNeedUpdate(needUpdate + 1)
    }

    const onStopClick = async (idx) => {
        await stop_deploy(id, idx)
        setNeedUpdate(needUpdate + 1)
    }

    const columns = [
        {
            title: 'Module',
            dataIndex: 'mode_name',
            key: 'mode_name',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: status => (<TagRender status={status} />)
        },
        {
            title: 'Progress',
            dataIndex: 'do_count',
            key: 'do_count',
            render: (cnt, r) => (<span>{r.do_count + ' / ' + r.all_count}</span>)
        },
        {
            title: 'Reason',
            dataIndex: 'reason',
            key: 'reason',
        },
        {
            title: 'Operation',
            dataIndex: 'do_count',
            key: 'do_count',
            render: (cnt, r) => (<Button onClick={() => onViewClick(r.id)}>View</Button>)
        }
    ]

    const opColumns = [
        {
            title: 'Server',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Operation',
            dataIndex: 'op',
            key: 'op',
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: text => {
                if (text === 'prepare') {
                    return ('Preparing')
                }
                return 'Unknown'
            }
        },
        {
            title: 'Last operation time',
            dataIndex: 'mtime',
            key: 'mtime',
            render: text => (new Date(text).toLocaleString())
        },
        {
            title: 'Create time',
            dataIndex: 'ctime',
            key: 'ctime',
            render: text => (new Date(text).toLocaleString())
        },
        {
            title: 'Operation',
            dataIndex: 'index',
            key: 'index',
            render: (cnt, r) => {
                if (r.status === 'prepare') {
                    return (
                        <Popconfirm title='Stop this deployment?' onConfirm={() => onStopClick(r.index)}>
                            <Button danger>Stop</Button>
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
            {
                !id && (
                    <Table rowKey='id' dataSource={list.list} columns={columns}></Table>
                )
            }
            {
                id && (
                    <Tabs defaultActiveKey='0'>
                        <Tabs.TabPane tab='Summary' key='0'>
                            <Spin spinning={data.loading}>
                                <Typography.Title level={5}>
                                    Expected completion time:{data.last_time}
                                </Typography.Title>
                                <Progress status={data.is_active ? 'active' : 'exception'} percent={data.done_cnt / data.all_cnt * 100}
                                ></Progress>
                                <Table rowKey='index' dataSource={data.op_list} columns={opColumns}></Table>
                            </Spin>
                        </Tabs.TabPane>
                        <Tabs.TabPane tab='Upload' key='1'>
                            <Spin spinning={data.loading}>
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
                            <Transfer
                                style={{ width: '100%', textAlign: 'left' }}
                                titles={['Ready to rollback', 'Rollback']}
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
                        </Tabs.TabPane>
                    </Tabs>
                )
            }
        </div>
    )
}

export default withRouter(Deploy)
