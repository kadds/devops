import React, {useState, useImperativeHandle} from 'react'

const CodeLine = (props, ref) => {
    const [lines, setLines] = useState([])
    const [lastId, setId] = useState(0)
    useImperativeHandle(ref, () => ({
        pushData: pushData,
        ref: ref.current,
    }));
    const processNewLines = (lines) => {
        let id = lastId
        let new_lines = []
        for(let i = 0; i< lines.length; i++) {
            const value = lines[i]
            if (value === '') {
                continue;
            }
            const flag = lines[i] === '=================='
            if (flag) {
                id++
                new_lines.push({value, flag: id})
                id++
            }
            else {
                new_lines.push({value, flag: id})
            }
        }
        setId(id)
        return new_lines
    }
    const pushData = (data) => {
        const vals = data.split('\n')
        if(vals.length === 0) return;
        let new_lines = [...lines]
        if (new_lines.length > 0) {
            if (new_lines[new_lines.length - 1] !== '') {
                vals[0] = new_lines[new_lines.length - 1].value + vals[0]
                new_lines.pop()
                new_lines.push(...processNewLines(vals))
            }
            else {
                new_lines.push(...processNewLines(vals))
            }
        }
        else {
            new_lines.push(...processNewLines(vals))
        }

        setLines(new_lines)

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
                lines.map((line, i) => {
                    if (line.flag % 4) {
                        return ( <pre className='line head' key={i}>{line.value}</pre>)
                    }
                    else {
                        return ( <pre className='line' key={i}>{line.value}</pre>)
                    }
                })
            }
            </div>
        </div>
    )
}

export default  React.forwardRef(CodeLine)