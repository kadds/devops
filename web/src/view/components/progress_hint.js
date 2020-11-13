import React, { useState, useEffect } from 'react'

const ProgressHint = (props) => {
    const [interval, setInterval] = useState(0)
    useEffect(() => {
        setInterval(0)
        setTimeout(() => {
            setInterval(props.interval)
        })
    }, [props.interval])
    return (
        <div className={`progress_hint ${interval > 0 ? 'enable' : 'disable'}`} >
            {
                interval && (
                    <div className='inner' style={{ animationDuration: interval + 's' }}></div>
                )
            }
        </div >
    )
}

export default ProgressHint
