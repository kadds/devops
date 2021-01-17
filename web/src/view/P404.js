import React from 'react'
import { Result, Button } from 'antd'
import { withRouter } from 'react-router-dom'

function P404(props) {
    return (
        <Result
            className={'page'}
            status="404"
            title="404"
            subTitle="Sorry, the page you visited does not exist."
            extra={<Button onClick={() => { props.history.push('/index') }} type="primary">Back Home</Button>}
        />

    )
}

export default withRouter(P404)

