import React, { useState, useEffect } from 'react'
import { info, update_mark } from '../../api/user'
import { Descriptions, Input } from 'antd'
import moment from 'moment'

const UserInfo = () => {
    const [user, setUser] = useState(null)
    const [mark, setMark] = useState('')

    useEffect(() => {
        async function run_user() {
            const user = await info()
            setUser(user)
            setMark(user.mark)
        }
        run_user()
    }, [])

    const onChange = (e) => {
        const v = e.target.value
        setMark(v)
        console.log(v);
        (async () => {
            await update_mark(v)
        })()
    }

    return (
        <div style={{ width: 400, margin: '0 auto' }}>
            {
                user && (
                    <Descriptions column={1}>
                        <Descriptions.Item label='User'>
                            {user.nick}
                        </Descriptions.Item>
                        <Descriptions.Item label='Last login'>
                            {user.last_login_time ? moment(user.last_login_time).fromNow() : 'Never login'}
                        </Descriptions.Item>
                        <Descriptions.Item label='Last login ip'>
                            {user.last_login_ip}
                        </Descriptions.Item>
                        <Descriptions.Item label='Mark'>
                            <Input value={mark} onChange={onChange} />
                        </Descriptions.Item>
                        <Descriptions.Item label='Create time'>
                            {moment(user.ctime).format('lll')}
                        </Descriptions.Item>
                    </Descriptions>
                )
            }
        </div>
    )
}

export default UserInfo
