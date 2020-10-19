import React, { useState, useEffect, useRef } from 'react'
import { get_deploy_list } from '../../api/deploy'
import { withRouter } from "react-router-dom"
import { Table, Tag, Button } from 'antd'
import moment from 'moment'

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
    const [list, setList] = useState({ list: [], loading: false })
    const [pagination, setPagination] = useState({ total: 0, current: 1, pageSize: 10 })
    const [needUpdate, setNeedUpdate] = useState(0)

    const handleTableChange = (pagination, filters, sorter) => {
        setPagination({ ...pagination })
        setNeedUpdate(needUpdate + 1)
    }

    const ref = useRef()
    ref.current = pagination

    useEffect(() => {
        async function run() {
            setList({ loading: true, list: [] })
            const pagination = ref.current
            const [data, total] = await get_deploy_list(pagination.current - 1, pagination.pageSize)
            setList({ loading: false, list: data })
            setPagination(v => { return { ...v, total } })
        }
        run()
    }, [needUpdate])


    const goModule = (name) => {
        props.history.push({ pathname: '/module', search: '?name=' + encodeURIComponent(name) })
    }

    const onViewClick = (id) => {
        props.history.push({ pathname: '/deploy/detail', search: '?id=' + id })
    }


    const columns = [
        {
            title: 'Module',
            dataIndex: 'mode_name',
            key: 'mode_name',
            render: v => (<Button type='link' onClick={() => goModule(v)}>{v}</Button>)
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: status => (<TagRender status={status} />)
        },
        {
            title: 'Create time',
            dataIndex: 'ctime',
            key: 'ctime',
            render: ctime => (<span>{moment(ctime).format('lll')}</span>)
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
            render: (cnt, r) => (<Button type='link' onClick={() => onViewClick(r.id)}>View</Button>)
        }
    ]


    return (
        <div className='page'>
            <Table rowKey='id' onChange={handleTableChange} pagination={pagination} dataSource={list.list} columns={columns}></Table>
        </div>
    )
}

export default withRouter(Deploy)
