import React, {useState, useImperativeHandle} from 'react'

const CodeLine = (props, ref) => {
    const [lines, setLines] = useState([])
    useImperativeHandle(ref, () => ({
        pushData: pushData,
        ref: ref.current,
    }));
    const pushData = (data) => {
        const vals = data.split('\n')
        setLines([...lines, ...vals])

        const e = document.getElementById('output_log')
        if (e && e.scrollTop + e.clientHeight <= e.scrollHeight + 20) {
            setTimeout(() => {
                e.scrollTo({ left: 0, top: e.scrollHeight, behavior: 'smooth' })
            }, 100)
        }
    }
    return (
        <div style={props.style} id='output_log' className='output'>
            <div className='lines'>
            {
                lines.map((line, i) => (
                    <pre className='line' key={i}>{line}</pre>
                ))
            }
            </div>
        </div>
    )
}

export default  React.forwardRef(CodeLine)