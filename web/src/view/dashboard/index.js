import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Descriptions } from 'antd'
import { TinyLine } from '@ant-design/charts'
import { get_pipeline_stat } from '../../api/pipeline'
import { info } from '../../api/user'

const DashBoardIndex = () => {
    const [activity, setActivity] = useState({ list: [] })
    const [user, setUser] = useState(null)

    useEffect(() => {
        async function run() {
            const stat_list = await get_pipeline_stat()
            setActivity({ list: stat_list.map(v => { return v.count }) })
        }
        run()
        async function run_user() {
            const user = await info()
            setUser(user)
        }
        run_user()
    }, [])

    const activityConfig = {
        autoFit: true,
        smooth: true,
        data: activity.list,
        style: {
            height: 55,
            width: '100%'
        },
        color: '#74cf99'
    }

    return (
        <div className='page'>
            <Row gutter={[16, 16]}>
                <Col span={16}>
                    <Card size='small' title='Recently pipelines'>

                    </Card>
                </Col>
                <Col span={8}>
                    <Card size='small' title='User'>
                        {
                            user && (
                                <Descriptions column={1}>
                                    <Descriptions.Item label='User'>
                                        {user.nick}
                                    </Descriptions.Item>
                                    <Descriptions.Item label='Last login'>
                                        {new Date(user.last_login_time).toLocaleString()}
                                    </Descriptions.Item>
                                    <Descriptions.Item label='Last login ip'>
                                        {user.last_login_ip}
                                    </Descriptions.Item>
                                    <Descriptions.Item label='Mark'>
                                        {user.mark}
                                    </Descriptions.Item>
                                </Descriptions>
                            )
                        }
                    </Card>
                </Col>
                <Col span={16}>
                    <Card size='small' title='Deploying progress'>

                    </Card>
                </Col>
                <Col span={8}>
                    <Row>
                        <Col span={24}>
                            <Card size='small' title='Activity chart'>
                                <TinyLine {...activityConfig} />
                            </Card>
                        </Col>
                        <Col span={24}>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </div>
    )
}

export default DashBoardIndex
