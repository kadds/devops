import React from 'react'
import AppLog from './app_log'
import ClickLog from './click_log'
import { Tabs } from 'antd'

const LogIndex = () => {
    return (
        <div className='page'>
            <Tabs defaultActiveKey='0'>
                <Tabs.TabPane key='0' tab='Application Log'>
                    <AppLog />
                </Tabs.TabPane>
                <Tabs.TabPane key='1' tab='Click Stream'>
                    <ClickLog />
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}

export default LogIndex
