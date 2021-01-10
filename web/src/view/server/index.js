import React, { useEffect, useRef } from 'react'
import Server from './server'
import queryString from 'query-string'
import { withRouter } from 'react-router'

const ServerIndex = props => {
    let server_name = props.location.pathname === '/server' ? queryString.parse(props.location.search).name : null
    const ref = useRef()

    useEffect(() => {
        if (queryString.parse(props.location.search).new) {
            ref.current.new_dialog()
        }
    }, [props.location.search])

    useEffect(() => {
        if (server_name === undefined) {
            ref.current.select(null, null)
        }
        else {
            ref.current.select(null, server_name)
        }
    }, [server_name])

    return (
        <div className='page'>
            <Server ref={ref} />
        </div>
    )
}

export default withRouter(ServerIndex)
