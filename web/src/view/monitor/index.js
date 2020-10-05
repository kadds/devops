import React from 'react'
import { Tabs } from 'antd'
import MonitorServer from './server'
import MonitorVM from './vm'

const MonitorIndex = (props) => {
    return (
        <div className='page'>
            <Tabs defaultActiveKey='1'>
                <Tabs.TabPane tab='VM' key='1'>
                    <MonitorVM />
                </Tabs.TabPane>
                <Tabs.TabPane tab='Server' key='2'>
                    <MonitorServer />
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}

export default MonitorIndex
