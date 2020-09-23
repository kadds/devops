import React, { useEffect, useState } from 'react'
import { useLocation, withRouter } from "react-router-dom";
import PipeLineStageComm from './stages/comm'
import PipeLineStageDone from './stages/done'
import { get_pipeline, get_pipeline_log_id } from './../../api/pipeline'
import { Row, Progress, Divider, Col, Input, Typography } from 'antd';
import queryString from 'query-string'

function PipeLineComp(props) {
    if (props.pipeline.data.stage < 4) {
        return (<PipeLineStageComm pipeline={props.pipeline.data} />)
    }
    else if (props.pipeline.data.stage == 4) {
        return (<PipeLineStageDone pipeline={props.pipeline.data} />)
    }
    return 'unknown'
}

const PipeLineDetail = (props) => {
    const [pipeline, setPipeline] = useState({ loading: false, data: null })
    useEffect(() => {
        async function run() {
            const id = queryString.parse(props.location.search).id
            setPipeline({ loading: true, data: null })
            const p = await get_pipeline(id)
            setPipeline({ loading: false, data: p })
        }
        run()
    }, [props.location])

    return (
        <div className='page'>
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
                    <PipeLineComp pipeline={pipeline} />
                )
            }
        </div>
    )
}

export default withRouter(PipeLineDetail)
