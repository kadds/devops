import React from 'react'
import { Tabs } from 'antd'

const MonitorIndex = (props) => {
    return (
        <div className='page'>
            <Tabs defaultActiveKey='1'>
                <Tabs.TabPane tab='VM' key='1'>

                </Tabs.TabPane>
                <Tabs.TabPane tab='Server' key='2'>

                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}

export default MonitorIndex
