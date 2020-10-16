import React, { useState } from 'react'
import { Tabs } from 'antd'
import MonitorServer from './server'
import MonitorVM from './vm'

const MonitorIndex = () => {
    const [activeKey, setActiveKey] = useState('1')
    const onChange = key => {
        setActiveKey(key)
    }
    return (
        <div className='page'>
            <Tabs defaultActiveKey='1' onChange={onChange}>
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

export default MonitorIndex
