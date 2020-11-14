import React, { useState, useEffect } from 'react'
import ReactEcharts from 'echarts-for-react'
import { Card, Row, Col, Button, Avatar } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import { get_pipeline_stat } from '../../api/pipeline'
import { info } from '../../api/user'
import echarts from 'echarts'
import ThemeJson from '../../theme.json'
import moment from 'moment'
import { withRouter } from 'react-router-dom'

// register theme object
echarts.registerTheme('theme', ThemeJson)

const DashBoardIndex = (props) => {
    const [activity, setActivity] = useState({ list: [] })
    const [user, setUser] = useState(null)

    useEffect(() => {
        async function run() {
            const stat_list = await get_pipeline_stat()
            setActivity({ list: stat_list.map(v => { return [v.time, v.count] }) })
        }
        run()
        async function run_user() {
            const user = await info()
            setUser(user)
        }
        run_user()
    }, [])

    const activityConfig = {
        yAxis: {
            type: 'value',
            min: 0,
            show: false,
        },
        xAxis: {
            type: 'time',
            show: false,
        },
        series: [{
            name: 'Pipeline commit',
            data: activity.list,
            type: 'line',
            symbol: 'circle',
            showSymbol: false,
            symbolSize: 2,
            smooth: true,
            color: '#74cf99',
            lineStyle: {
                width: 2
            },
        }],
        tooltip: {
            trigger: 'axis'
        },
    }

    return (
        <div className='page'>
            <Row gutter={[16, 16]}>
                <Col span={16}>
                    <Card size='small' title='Dashboard'>
                        <h2>Welcome to devops system</h2>
                        <div>
                            {
                                user && (
                                <Row gutter={[12, 8]}>
                                    <Col span={8}>
                                        <Avatar style={{ backgroundColor: '#87d068' }} icon={<UserOutlined />} />
                                    </Col>
                                    <Col span={16}>
                                        last login {user.last_login_time ? moment(user.last_login_time).fromNow() : 'Never login'} at  {user.last_login_ip}
                                    </Col>
                                    <Col span={8}>
                                    {user.nick} 
                                    </Col>
                                    <Col span={8}>
                                        {user.mark}
                                    </Col>
                                </Row>
                                )
                            }
                        </div>
                    </Card>
                </Col>
                <Col span={8}>
                    <Row>
                        <Col span={24}>
                            <Card size='small' title='Activity chart'>
                                <ReactEcharts theme='theme' style={{ width: '100%', height: 140 }} option={activityConfig} />
                            </Card>
                        </Col>
                        <Col span={24}>
                        </Col>
                    </Row>
                </Col>
                <Col  span={8}>
                    <Card size='small' title='Operations'>
                        <Row gutter={[12, 12]}>
                            <Col>
                                <Button onClick={() => props.history.push({pathname: '/pipeline/list', search: '?new=1'})}>New pipeline</Button>
                            </Col>
                            <Col>
                                <Button onClick={() => props.history.push({pathname: '/server', search: '?new=1'})}>New Server</Button>
                            </Col>
                            <Col>
                                <Button onClick={() => props.history.push({pathname: '/var', search: '?new=1'})}>New Variable</Button>
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col span={16}>
                    <Card size='small' title='Recent Servers'>
                        <div className='box-card'>

                        </div>
                    </Card>
                </Col>
                <Col span={12}>
                    <Card size='small' title='Recently pipelines'>

                    </Card>
                </Col>
                <Col span={12}>
                    <Card size='small' title='Deploying progress'>

                    </Card>
                </Col>
            </Row>
        </div >
    )
}

export default withRouter(DashBoardIndex)
