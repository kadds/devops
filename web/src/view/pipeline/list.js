import React, { useState, useEffect } from 'react'
import { Table, Button } from 'antd'
import { get_pipelines } from './../../api/pipeline'

const PipeLineList = () => {
    const go = (id) => {
        console.log(id)
    }
    const columns = [
        {
            title: 'id',
            dataIndex: 0,
            key: 'id',
            render: text => <span>{text}</span>
        },
        {
            title: 'module',
            dataIndex: 1,
            key: 'module',
            render: text => <span>{text}</span>
        },
        {
            title: 'action',
            dataIndex: 0,
            key: 'action',
            render: (id, r) => (
                <Button type='link' onClick={go(id)}>
                    Go
                </Button>
            )
        }
    ]
    const [data, setData] = useState([])


    useEffect(() => {
        async function run() {
            const list = await get_pipelines()
            setData(list)
        }
        run()
    }, [])
    return (
        <Table dataSource={data} columns={columns}>

        </Table>
    )
}

export default PipeLineList
