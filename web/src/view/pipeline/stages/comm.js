import React, { useEffect, useState, useRef } from 'react'
import { get_pipeline_log_id } from './../../../api/pipeline'
import { base_ws_url } from '../../../api/comm'
import { Tag, Row, Col, Spin, Result, Button } from 'antd'
import { ClockCircleOutlined, SyncOutlined, CheckCircleOutlined } from '@ant-design/icons'

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

function useEventListener(eventName, handler, element = window) {
    const saveHandler = useRef()

    useEffect(() => {
        saveHandler.current = handler
    }, [handler])

    useEffect(
        () => {
            const isSupported = element && element.addEventListener
            if (!isSupported) return

            const eventListener = event => saveHandler.current(event)
            element.addEventListener(eventName, eventListener)
            return () => {
                element.removeEventListener(eventName, eventListener);
            }
        },
        [eventName, element]
    )
}

const PipeLineStageComm = (props) => {
    const [data, setData] = useState('')
    const [loading, setLoading] = useState(0)
    const ref = useRef()
    const [height, setHeight] = useState((window.innerHeight - 80) + 'px')
    ref.current = data

    useEffect(() => {
        let ws = null
        async function run() {
            setLoading(0)
            const id = (await get_pipeline_log_id(props.pipeline.id)).id
            ws = new WebSocket(base_ws_url + '/log?id=' + id)
            ws.onopen = function () {
                setLoading(1)
            }
            ws.onclose = function () {
                setLoading(2)
            }

            ws.onmessage = function (val) {
                setData(ref.current + val.data)
                const e = document.getElementById('output_log')
                if (e.scrollTop + e.clientHeight <= e.scrollHeight + 20) {
                    setTimeout(() => {
                        e.scrollTo({ left: 0, top: e.scrollHeight, behavior: 'smooth' })
                    }, 100)
                }
            }
        }
        run()
        return () => {
            if (ws)
                ws.close()
        }
    }, [props.pipeline])

    useEventListener('resize', () => {
        setHeight((window.innerHeight - 80) + 'px')
    })

    const scroll = () => {
        document.getElementById('rightPanel').scrollTo({ left: 0, top: window.innerHeight - 80, behavior: 'smooth' })
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
            <Row gutter={12} style={{ marginBottom: 20 }}>
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
            <pre style={{ height: height }} id='output_log' className="output">{data}</pre>
        </div>
    )
}

export default PipeLineStageComm

