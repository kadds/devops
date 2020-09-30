import React, { useState, useEffect, Fragment } from 'react'
import { get_deploy_list, get_deploy, deploy_do_upload, deploy_do_rollback } from '../../api/deploy'
import { withRouter } from "react-router-dom"
import { Table, Tabs, Tag, Divider, Button, Form, Transfer, Progress } from 'antd'
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
        rollback__targets: [], all_rollback: []
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
    }, [needUpdate])

    useEffect(() => {
        async function run() {
            if (id) {
                setData({ ...data, loading: true })
                const dt = await get_deploy(id)
                setData({
                    loading: false,
                    all_upload: dt.all.filter(v => { return v.can_upload })
                        .map(v => { return { key: v.name, title: v.name, is_test: v.is_test } }),
                    all_rollback: dt.all.filter(v => { return v.can_rollback })
                        .map(v => { return { key: v.name, title: v.name, is_test: v.is_test } }),
                    upload_targets: dt.all.filter(v => { return v.version === id })
                        .map(v => { return v.name }),
                    rollback_targets: dt.all.filter(v => { return v.version !== id })
                        .map(v => { return v.name }),
                    all_cnt: dt.all.length
                })
            }
        }
        run()
    }, [needUpdate])
    const onViewClick = (id) => {
        props.history.push({ pathname: '/deploy', search: '?id=' + id })
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
                            <Progress percent={data.all_cnt} ></Progress>
                        </Tabs.TabPane>
                        <Tabs.TabPane tab='Upload' key='1'>
                            <Transfer
                                style={{ width: '100%', textAlign: 'left' }}
                                titles={['Ready to upload', 'Uploaded']}
                                dataSource={data.all_upload}
                                targetKeys={data.upload_targets}
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
                        </Tabs.TabPane>
                        <Tabs.TabPane tab='Rollback' key='2'>
                            <Transfer
                                style={{ width: '100%' }}
                                titles={['Ready to rollback', 'Rollback']}
                                dataSource={data.all_rollback}
                                targetKeys={data.rollback_target}
                                render={it => it.title}
                                listStyle={{
                                    width: 350,
                                    height: 400,
                                }}
                            >
                            </Transfer>
                        </Tabs.TabPane>
                    </Tabs>
                )
            }
        </div>
    )
}

export default withRouter(Deploy)
