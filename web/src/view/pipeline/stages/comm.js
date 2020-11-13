import React, { useEffect, useState, useRef } from 'react'
import { get_pipeline_log_id } from './../../../api/pipeline'
import { base_ws_url } from '../../../api/comm'
import { Tag, Row, Col, Spin, Result, Button } from 'antd'
import { ClockCircleOutlined, SyncOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useEventListener } from '../../../comm/util'
import CodeLine from '../../components/codeline'

const TagRender = (props) => {
    if (props.loading === 0) {
        return (
            <Tag icon={<ClockCircleOutlined />} color="default">
                requesting
            </Tag>
        )
    }
    else if (props.loading === 1) {

        return (
            <Tag icon={<SyncOutlined spin />} color="processing">
                processing
            </Tag>
        )
    }
    else if (props.loading === 2) {
        return (
            <Tag icon={<CheckCircleOutlined />} color="success">
                success
            </Tag>
        )
    }
}

const PipeLineStageComm = (props) => {
    const [loading, setLoading] = useState(0)
    const [height, setHeight] = useState((window.innerHeight - 50) + 'px')
    const { pipeline, onClose } = props
    const codeRef = useRef()

    useEffect(() => {
        let ws = null
        async function run() {
            setLoading(0)
            const id = (await get_pipeline_log_id(pipeline.id)).id
            ws = new WebSocket(base_ws_url + '/log?id=' + id)
            ws.onopen = function () {
                setLoading(1)
            }
            ws.onclose = function () {
                setLoading(2)
                if (onClose) {
                    onClose()
                }
            }

            ws.onmessage = function (val) {
                codeRef.current.pushData(val.data)
            }
        }
        run()
        return () => {
            if (ws)
                ws.close()
        }
    }, [pipeline, onClose])

    useEventListener('resize', () => {
        setHeight((window.innerHeight - 50) + 'px')
    })

    const scroll = () => {
        document.getElementById('rightPanel').scrollTo({ left: 0, top: window.innerHeight - 50, behavior: 'smooth' })
    }

    const stageStr = (stage) => {
        if (stage === -1) {
            return 'Prepare environment failed'
        }
        else if (stage === -2) {
            return 'Get source code failed'
        }
        else if (stage === -3) {
            return 'Build target failed'
        }
        else if (stage === -4) {
            return 'Do deploy failed'
        }
        else {
            return 'Unknown failed'
        }
    }

    return (
        <div>
            {
                props.pipeline && props.pipeline.stage && props.pipeline.stage < 0 && (
                    <Result
                        status="error"
                        title="Pipeline Failed"
                        subTitle={
                            stageStr(props.pipeline.stage)
                        }
                        extra={[
                        ]}
                    >
                    </Result>
                )
            }
            <Row gutter={12} align='middle' style={{ marginBottom: 5 }}>
                <Col>
                    <Button onClick={scroll} type='link'>Log loading status: </Button>
                </Col>
                <Col>
                    <TagRender loading={loading}></TagRender>
                </Col>
                <Col>
                    <Spin spinning={loading !== 2}></Spin>
                </Col>
            </Row>
            <CodeLine ref={codeRef} style={{height: height}}/>
        </div>
    )
}

export default PipeLineStageComm

