import React from 'react'
import { withRouter } from 'react-router-dom'
import { Result, Button } from 'antd';

const PipeLineStageDone = (props) => {
    return (
        <div>
            <Result
                status="success"
                title="Successfully Execute pipeline"
                subTitle={`Pipeline id ${props.pipeline.id} module name ${props.pipeline.mode_name} is already finish`}
                extra={[
                    <Button onClick={() => { props.history.push('/pipeline/list') }}>Return list</Button>,
                ]}
            />
        </div>
    )
}

export default withRouter(PipeLineStageDone)


