import React, {useState, useImperativeHandle} from 'react'
import {Tooltip} from 'antd'

const CodeLine = (props, ref) => {
    const [lines, setLines] = useState([])
    const [autoScroll, setAutoScroll] = useState(false)

    useImperativeHandle(ref, () => ({
        pushData: pushData,
        popData: popData,
        ref: ref.current,
    }))

    const popData = (n) => {
        if (n === undefined || n === null) {
            n = lines.length
        }
        let new_lines = []
        n = Math.max(0, lines.length - n)
        for(let i = 0; i < n; i++) {
            new_lines.push(lines[i])
        }
        setLines(new_lines)
    }

    const processNewLines = (lines) => {
        let new_lines = []
        for(let i = 0; i< lines.length; i++) {
            let value = lines[i].code
            const line_style = lines[i].style
            const desc = lines[i].desc
            let tags = []
            let tokens = []
            for(const tag of props.tags) {
                tag.regex.lastIndex = 0
                let res = tag.regex.exec(value)
                while (res) {
                    tokens.push({start: res.index, end: res.index + res[0].length, style: { ...line_style, ...tag.style}})
                    res = tag.regex.exec(value)
                }
            }
            tokens.sort((a, b) => { if(a.start === b.start) {
                return b.end - a.end
            } else {return a.start - b.start}})
            let pre_len = 0
            for(const token of tokens) {
                if (pre_len !== token.start)
                    tags.push({value: value.substring(pre_len, token.start), style: line_style})
                tags.push({value: value.substring(token.start, token.end), style: token.style})
                pre_len = token.end
            }
            if (pre_len < value.length) {
                tags.push({value: value.substring(pre_len, value.length), style: line_style});
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
        if(data.length === 0) return
        let new_lines = [...lines]
        if (new_lines.length > 0) {
            new_lines.push(...processNewLines(data))
        }
        else {
            new_lines = processNewLines(data)
        }

        const e = document.getElementById('output_log')
        if (e && autoScroll) {
            setTimeout(() => {
                e.scrollTo({ left: e.scrollLeft, top: e.scrollHeight + 10000, behavior: 'smooth' })
            }, 200)
        }
        setLines(new_lines)
    }

    const onWheel = e => {
        let deltaY = e.nativeEvent.deltaY
        const ele = document.getElementById('output_log')
        if (deltaY > 0) {
            if (ele.scrollTop + ele.clientHeight >= ele.scrollHeight) {
                setAutoScroll(true)
                console.log('load_more')
                props.onLoadMore && props.onLoadMore()
                return
            }
        }
        setAutoScroll(false)
    }

    return (
        <div style={props.style} id='output_log' className='output' onWheel={onWheel}>
            <div className='lines' >
            {
                lines.map((line, i) => {
                    return (
                        <Tooltip trigger={['click', 'contextMenu', 'hover']} mouseEnterDelay={2} arrowPointAtCenter={true} title={line.desc} color='#455' key={i}>
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