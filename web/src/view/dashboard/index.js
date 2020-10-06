import React, { useState, useEffect } from 'react'
import { Card, Row, Col } from 'antd'
import { TinyLine, DualAxes, Area } from '@ant-design/charts'
import { get_pipeline_stat } from '../../api/pipeline'

const DashBoardIndex = () => {
    const [activity, setActivity] = useState({ list: [] })

    useEffect(() => {
        async function run() {
            const stat_list = await get_pipeline_stat()
            setActivity({ list: stat_list.map(v => { return v.count }) })
        }
        run()
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
