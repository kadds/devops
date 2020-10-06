import React, { useEffect, useState, useCallback } from 'react'
import { withRouter } from "react-router-dom";
import PipeLineStageComm from './stages/comm'
import PipeLineStageDone from './stages/done'
import { get_pipeline } from './../../api/pipeline'
import { Row, Divider, Col, Typography } from 'antd';
import queryString from 'query-string'



const PipeLineDetail = (props) => {
    const [pipeline, setPipeline] = useState({ loading: false, data: null })
    const [needUpdate, setNeedUpdate] = useState(0)
    useEffect(() => {
        async function run() {
            const id = queryString.parse(props.location.search).id
            setPipeline({ data: null, loading: true })
            const p = await get_pipeline(id)
            setPipeline({ loading: false, data: p })
        }
        run()
    }, [props.location, needUpdate])

    const onClose = useCallback(() => {
        if (needUpdate === 0 && pipeline.data.stage <= 4 && pipeline.data.stage >= 1) {
            setNeedUpdate(needUpdate + 1)
        }
    }, [needUpdate, pipeline])

    return (
        <div className='page'>
            {
                pipeline.data && (
                    <Row justify='space-between' style={{ position: 'relative' }}>
                        <Col className={`${Math.abs(pipeline.data.stage) === 1 ? 'step_active' : 'step'}`}>
                            Environment
                        </Col>
                        <Col className={`${Math.abs(pipeline.data.stage) === 2 ? 'step_active' : 'step'}`}>
                            Source code
                </Col>
                        <Col className={`${Math.abs(pipeline.data.stage) === 3 ? 'step_active' : 'step'}`}>
                            Build
                </Col>
                        <Col className={`${Math.abs(pipeline.data.stage) === 4 ? 'step_active' : 'step'}`}>
                            Deploy
                </Col>
                        <Col className={`${pipeline.data.stage === 100 ? 'step_active' : 'step'}`}>
                            Done
                </Col>
                    </Row>
                )
            }
            <Divider />
            {
                pipeline.data && (
                    <div style={{ textAlign: 'left' }}>
                        <Typography.Title level={5}>Mark: </Typography.Title>
                        <Typography.Text>
                            {pipeline.data.mark}
                        </Typography.Text>
                    </div>
                )
            }
            <Divider />
            {
                pipeline.data && pipeline.data.stage !== 100 && (
                    <PipeLineStageComm onClose={onClose} pipeline={pipeline.data} />
                )
            }
            {
                pipeline.data && pipeline.data.stage === 100 && (
                    <PipeLineStageDone pipeline={pipeline.data} />
                )
            }
        </div>
    )
}

export default withRouter(PipeLineDetail)
