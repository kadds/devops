import React from 'react'
import LogView from './log_view'
import { Tabs } from 'antd'

const LogIndex = () => {
    return (
        <div className='page'>
            <Tabs defaultActiveKey='0'>
                <Tabs.TabPane key='0' tab='Application Log'>
                    <LogView />
                </Tabs.TabPane>
                <Tabs.TabPane key='1' tab='Click Stream'>
                    todo
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}

export default LogIndex
