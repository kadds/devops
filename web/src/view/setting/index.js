import React from 'react'
import { Tabs } from 'antd'
import UserInfo from './user_info'
import UserList from './user_list'

const Setting = () => {
    return (
        <div className='page'>
            <Tabs defaultActiveKey='1'>
                <Tabs.TabPane tab='User Info' key='1'>
                    <UserInfo />
                </Tabs.TabPane>
                <Tabs.TabPane tab='User list' key='2'>
                    <UserList />
                </Tabs.TabPane>
            </Tabs>
        </div>
    )
}

export default Setting
