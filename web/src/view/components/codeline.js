import React, {useState, useImperativeHandle} from 'react'
import {Tooltip} from 'antd'

const CodeLine = (props, ref) => {
    const [lines, setLines] = useState([])

    useImperativeHandle(ref, () => ({
        pushData: pushData,
        ref: ref.current,
    }));

    const processNewLines = (lines) => {
        let new_lines = []
        for(let i = 0; i< lines.length; i++) {
            let value = lines[i].code
            const desc = lines[i].desc
            let tags = []
            let tokens = []
            for(const tag of props.tags) {
                tag.regex.lastIndex = 0
                let res = tag.regex.exec(value)
                while (res) {
                    tokens.push({start: res.index, end: res.index + res[0].length, style: tag.style})
                    res = tag.regex.exec(value)
                }
            }
            tokens.sort((a, b) => { if(a.start === b.start) {
                return b.end - a.end
            } else {return a.start - b.start}})
            let pre_len = 0
            for(const token of tokens) {
                if (pre_len !== token.start)
                    tags.push({value: value.substring(pre_len, token.start)})
                tags.push({value: value.substring(token.start, token.end), style: token.style})
                pre_len = token.end
            }
            if (pre_len < value.length) {
                tags.push({value: value.substring(pre_len, value.length)});
            }
            if (value === '') {
                // placement
                tags.push({value: ' '})
            }
            new_lines.push({value, desc, tags: tags})
        }
        return new_lines
    }

    const pushData = (data) => {
        if(data.length === 0) return;
        let new_lines = [...lines]
        if (new_lines.length > 0) {
            if (new_lines[new_lines.length - 1] !== '') {
                data[0].code = new_lines[new_lines.length - 1].value + data[0].code
                new_lines.pop()
                new_lines.push(...processNewLines(data))
            }
            else {
                new_lines.push(...processNewLines(data))
            }
        }
        else {
            new_lines = processNewLines(data)
        }

        setLines(new_lines)

        const e = document.getElementById('output_log')
        if (e && (e.scrollTop + e.clientHeight >= e.scrollHeight - 20)) {
            setTimeout(() => {
                e.scrollTo({ left: e.scrollLeft, top: e.scrollHeight, behavior: 'smooth' })
            }, 100)
        }
    }
    return (
        <div style={props.style} id='output_log' className='output'>
            <div className='lines'>
            {
                lines.map((line, i) => {
                    return (
                        <Tooltip title={line.desc} color='#455' key={i}>
                            <pre className='line'>
                                {
                                    line.tags.map((tag, i) => (<span key={i} className='tag' style={tag.style}>{tag.value}</span>))
                                }
                            </pre>
                        </Tooltip>
                    )
                })
            }
            </div>
        </div>
    )
}

export default  React.forwardRef(CodeLine)