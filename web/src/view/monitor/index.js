import React, { useState } from 'react'
import { Tabs } from 'antd'
import MonitorServer from './server'
import MonitorVM from './vm'
import { withRouter } from 'react-router'
import queryString from 'query-string'

const MonitorIndex = (props) => {
    const [activeKey, setActiveKey] = useState('1')
    const onChange = key => {
        setActiveKey(key)
    }
    const vm = queryString.parse(props.location.search).vm
    const server = queryString.parse(props.location.search).server
    const tid = queryString.parse(props.location.search).tid
    let defaultKey = '1'
    if (vm) {
        defaultKey = '1'
    }
    else if (server) {
        defaultKey = '2'
    }
    else if (tid) {
        defaultKey = '3'
    }

    return (
        <div className='page'>
            <Tabs defaultActiveKey={defaultKey} onChange={onChange}>
                <Tabs.TabPane tab='VM Statistics' key='1'>
                    <MonitorVM active={activeKey === '1'} />
                </Tabs.TabPane>
                <Tabs.TabPane tab='Server Statistics' key='2'>
                    <MonitorServer active={activeKey === '2'} />
                </Tabs.TabPane>
                <Tabs.TabPane tab='Call Graph' key='3'>
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}

export default withRouter(MonitorIndex)
