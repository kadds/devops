import React, { useEffect, useState } from 'react'
import { useLocation } from "react-router-dom";
import PipeLineStageComm from './stages/comm'
import PipeLineStageDone from './stages/done'
import { get_pipeline, get_pipeline_log_id } from './../../api/pipeline'
import { Row, Progress, Divider, Col, Input, Typography } from 'antd';

const PipeLineDetail = () => {
    const location = useLocation()
    const [pipeline, setPipeline] = useState({ loading: false, data: null })
    useEffect(() => {
        async function run() {
            setPipeline({ loading: true, data: null })
            const p = await get_pipeline(location.id)
            setPipeline({ loading: false, data: p })
            console.log(p)
        }
        run()
    }, [location])

    function PipeLineComp(props) {
        if (pipeline.data.stage < 4) {
            return (<PipeLineStageComm pipeline={pipeline.data} />)
        }
        else if (pipeline.data.stage == 4) {
            return (<PipeLineStageDone pipeline={pipeline.data} />)
        }
        return 'unknown'
    }

    return (
        <div>
            {
                pipeline.data && (
                    <Row justify='space-between' style={{ position: 'relative' }}>
                        <Col className={`${pipeline.data.stage === 0 ? 'step_active' : 'step'}`}>
                            Environment
                        </Col>
                        <Col className={`${pipeline.data.stage === 1 ? 'step_active' : 'step'}`}>
                            Source code
                </Col>
                        <Col className={`${pipeline.data.stage === 2 ? 'step_active' : 'step'}`}>
                            Build
                </Col>
                        <Col className={`${pipeline.data.stage === 3 ? 'step_active' : 'step'}`}>
                            Deploy
                </Col>
                        <Col className={`${pipeline.data.stage === 4 ? 'step_active' : 'step'}`}>
                            Done
                </Col>
                    </Row>
                )
            }
            <Divider />
            {
                pipeline.data && (
                    <div style={{ textAlign: 'left' }}>
                        <Typography.Title level={3}>Mark: </Typography.Title>
                        <Typography.Text>
                            {pipeline.data.mark}
                        </Typography.Text>
                    </div>
                )
            }
            <Divider />
            {
                pipeline.data && (
                    <PipeLineComp />
                )
            }
        </div>
    )
}

export default PipeLineDetail
