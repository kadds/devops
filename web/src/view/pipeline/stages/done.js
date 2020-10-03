import React, { useState, Fragment } from 'react'
import { withRouter } from 'react-router-dom'
import { Result, Button, Row, Col, Divider } from 'antd';
import PipeLineStageComm from './comm'
import { RollbackOutlined, LinkOutlined } from '@ant-design/icons'

const PipeLineStageDone = (props) => {
    const [showLog, setShowLog] = useState(false)
    const goDeployClick = (id) => {
        props.history.push({ pathname: '/deploy', search: '?id=' + id })
    }
    return (
        <div>
            <Result
                status="success"
                title="Successfully Execute pipeline"
                subTitle={`Pipeline id ${props.pipeline.id} module name ${props.pipeline.mode_name} is already finish`}
                extra={[
                    <Row key={1} gutter={8} justify='center'>
                        <Col>
                            <Button icon={<RollbackOutlined />} onClick={() => { props.history.push('/pipeline/list') }}>Return list</Button>
                        </Col>
                        <Col>
                            <Button disabled={showLog} onClick={() => { setShowLog(true) }}>Show log</Button>
                        </Col>
                        {
                            props.pipeline.deploy_id && (
                                <Col>
                                    <Button type='primary' icon={<LinkOutlined />} onClick={() => { goDeployClick(props.pipeline.deploy_id) }}>Go deployment</Button>
                                </Col>
                            )
                        }
                    </Row>
                ]}
            />
            {
                showLog && (
                    <Fragment>
                        <Divider />
                        <PipeLineStageComm pipeline={props.pipeline} />
                    </Fragment>
                )
            }
        </div>
    )
}

export default withRouter(PipeLineStageDone)


