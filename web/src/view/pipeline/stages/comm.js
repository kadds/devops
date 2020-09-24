import React, { useEffect, useState, useRef } from 'react'
import { get_pipeline_log_id } from './../../../api/pipeline'
import { base_ws_url } from '../../../api/comm'
import { Tag, Row, Col, Spin } from 'antd'
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
            <Tag icon={<SyncOutlined />} color="processing">
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
    const [data, setData] = useState('')
    const [loading, setLoading] = useState(0)
    const ref = useRef()
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
            }
        }
        run()
        return () => {
            if (ws)
                ws.close()
        }
    }, [props.pipeline])

    return (
        <div>
            <Row gutter={12} style={{ marginBottom: 20 }}>
                <Col>
                    Status:
                </Col>
                <Col>
                    <TagRender loading={loading}></TagRender>
                </Col>
                <Col>
                    <Spin spinning={loading !== 2}></Spin>
                </Col>
            </Row>
            <pre className="output">{data}</pre>
        </div>
    )
}

export default PipeLineStageComm

