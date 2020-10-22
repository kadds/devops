import React, { useState, useEffect, Fragment, useRef } from 'react'
import { Row, Col, Card, Select, Spin, Form, InputNumber, Divider, Typography, DatePicker } from 'antd'
import ReactEcharts from 'echarts-for-react'
import { get_all_vm } from '../../api/vm'
import { get_monitor_vm } from '../../api/monitor'
import { useEventListener } from '../../comm/util'
import moment from 'moment'
import echarts from 'echarts'
import ThemeJson from '../../theme.json'
import { useInterval } from '../../comm/util'
import ProgressHint from '../compoments/progress_hint'
import queryString from 'query-string'
import { withRouter } from 'react-router'

// register theme object
echarts.registerTheme('theme', ThemeJson)

const chartStyleMin = {
    width: 380,
    height: 220,
}

const chartStyleNormal = {
    width: 500,
    height: 350,
}

const chartStyleMax = {
    width: 650,
    height: 440,
}

function getChartStyle(width) {
    if (width > 572) {
        if (width > 700) {
            return chartStyleMax
        }
        return chartStyleNormal
    }
    else {
        return chartStyleMin
    }
}


const CommConfig = {
    toolbox: {
        feature: {
            saveAsImage: {},
            restore: {},
            dataZoom: {
                show: true,
            }
        }
    },
    tooltip: {
        trigger: 'axis'
    },
    legend: {
        left: 'center'
    },
    xAxis: {
        type: 'time',
    },
    dataZoom: [{
        type: 'inside',
        start: 0,
        end: 100,
        minValueSpan: 1000,
        throttle: 0,
    },
    {
        start: 0,
        end: 100,
        handleIcon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
        handleSize: '70%',
        minValueSpan: 1000,
        throttle: 0,
        handleStyle: {
            color: '#fff',
            shadowBlur: 3,
            shadowColor: 'rgba(0, 0, 0, 0.6)',
            shadowOffsetX: 2,
            shadowOffsetY: 2
        }
    }],
}
const
    areaStyle1 = {
        color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
                offset: 0, color: '#5068bf' // 0% 处的颜色
            }, {
                offset: 1, color: '#80b099' // 100% 处的颜色
            }],
        }
    }

const
    areaStyle2 = {
        color: {
            type: 'linear',
            x: 0,
            y: 1,
            x2: 0,
            y2: 0,
            colorStops: [{
                offset: 0, color: '#a94442'
            }, {
                offset: 1, color: '#80b099'
            }],
        }
    }

const size_formatter = (v) => {
    if (v <= 0) {
        return '0'
    }
    else if (v < 1024) {
        return `${v} B`
    }
    else if (v < 1024 * 1024) {
        return `${(v / 1024).toFixed(1)} KiB`
    }
    else if (v < 1024 * 1024 * 1024) {
        return `${(v / (1024 * 1024)).toFixed(1)} MiB`
    }
    else {
        return `${(v / (1024 * 1024 * 1024)).toFixed(1)} GiB`
    }
}

const iops_formatter = (v) => {
    v = Math.abs(v)
    if (v <= 0) {
        return '0'
    }
    else if (v < 1000) {
        return `${v} /s`
    }
    else {
        return `${(v / 1000).toFixed(1)} k/s`
    }
}

const bps_axis_formatter = (v) => {
    v = Math.abs(v)
    if (v <= 0) {
        return '0'
    }
    else if (v < 1024) {
        return `${v}\nbps`
    }
    else if (v < 1024 * 1024) {
        return `${(v / 1024).toFixed(1)}\nKbps`
    }
    else if (v < 1024 * 1024 * 1024) {
        return `${(v / (1024 * 1024)).toFixed(1)}\nMbps`
    }
    else {
        return `${(v / (1024 * 1024 * 1024)).toFixed(1)}\nGbps`
    }
}

const bps_formatter = (v) => {
    v = Math.abs(v)
    if (v <= 0) {
        return '0'
    }
    else if (v < 1024) {
        return `${v} bps`
    }
    else if (v < 1024 * 1024) {
        return `${(v / 1024).toFixed(1)} Kbps`
    }
    else if (v < 1024 * 1024 * 1024) {
        return `${(v / (1024 * 1024)).toFixed(1)} Mbps`
    }
    else {
        return `${(v / (1024 * 1024 * 1024)).toFixed(1)} Gbps`
    }
}

const MonitorVMChart = (props) => {
    const [data, setData] = useState({ loading: false, cpu: [], mem: [], block_bytes: [[], []], block_io: [[], []], net_io: [[], []], net_bytes: [[], []] })
    const CPULineConfig = {
        ...CommConfig,
        title: {
            show: true,
            text: 'CPU'
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: 100,
            axisLabel: {
                formatter: '{value} %'
            }
        },
        visualMap: {
            top: 0,
            right: '100',
            pieces: [{
                gt: 0,
                lte: 80,
                color: '#89af66',
            }, {
                gt: 80,
                lte: 100,
                color: '#f55',
            }],
        },
        tooltip: {
            trigger: 'axis',
            formatter: v => (`${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'>${v[0].value[1]} %</span>`)
        },
        series: [{
            color: '#89af66',
            name: 'CPU used',
            data: data.cpu,
            type: 'line',
            symbol: 'diamond',
            showSymbol: false,
            sampling: 'max',
            smooth: 0.1,
            smoothMonotone: 'x',
            markLine: {
                silent: true,
                data: [{
                    yAxis: 80,
                }]
            },
        }],
    }

    const MemLineConfig = {
        ...CommConfig,
        title: {
            show: true,
            text: 'Memory'
        },
        yAxis: {
            type: 'value',
            min: 0,
            axisLabel: {
                formatter: size_formatter
            }
        },
        tooltip: {
            trigger: 'axis',
            formatter: v => (`${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'>${size_formatter(v[0].value[1])}</span> ${v[0].value[1]} B`)
        },
        series: [{
            name: 'Memory used',
            data: data.mem,
            type: 'line',
            smooth: 0.9,
            smoothMonotone: 'x',
            symbol: 'diamond',
            showSymbol: false,
            sampling: 'max',
        }],
    }

    const IOConfig = {
        ...CommConfig,
        title: {
            show: true,
            text: 'Block IOPS'
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (v) => (iops_formatter(v))
            }
        },
        tooltip: {
            trigger: 'axis',
            formatter: v => {
                if (v.length > 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${iops_formatter(v[0].value[1])} </span> <br/> ${v[1].seriesName}: <span class='tip-echarts'> ${iops_formatter(v[1].value[1])} </span>`
                }
                else if (v.length === 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${iops_formatter(v[0].value[1])} </span>`
                }
                return ''
            }
        },
        series: [{
            name: 'Read IOPS',
            data: data.block_io[0],
            type: 'line',
            symbol: 'diamond',
            showSymbol: false,
            sampling: 'max',
            smooth: 0.9,
            smoothMonotone: 'x',
            lineStyle: {
                width: 0,
            },
            areaStyle: areaStyle1,
        },
        {
            name: 'Write IOPS',
            data: data.block_io[1],
            type: 'line',
            symbol: 'triangle',
            showSymbol: false,
            smooth: 0.9,
            smoothMonotone: 'x',
            sampling: 'max',
            lineStyle: {
                width: 0,
            },
            areaStyle: areaStyle2,
        }
        ]
    }

    const IOBytesConfig = {
        ...CommConfig,
        title: {
            show: true,
            text: 'Block IO Bytes',
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (v) => (bps_axis_formatter(v)),
            },
        },
        tooltip: {
            trigger: 'axis',
            formatter: v => {
                if (v.length > 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${bps_formatter(v[0].value[1])} </span> <br/> ${v[1].seriesName}: <span class='tip-echarts'> ${bps_formatter(v[1].value[1])} </span>`
                }
                else if (v.length === 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${bps_formatter(v[0].value[1])} </span>`
                }
                return ''
            }
        },
        series: [{
            name: 'Read bytes',
            data: data.block_bytes[0],
            type: 'line',
            symbol: 'diamond',
            showSymbol: false,
            smooth: 0.9,
            smoothMonotone: 'x',
            sampling: 'max',
            lineStyle: {
                width: 0,
            },
            areaStyle: areaStyle1,
        },
        {
            name: 'Write bytes',
            data: data.block_bytes[1],
            type: 'line',
            symbol: 'triangle',
            showSymbol: false,
            smooth: 0.9,
            smoothMonotone: 'x',
            sampling: 'max',
            lineStyle: {
                width: 0,
            },
            areaStyle: areaStyle2,
        }
        ]
    }

    const NetBytesConfig = {
        ...CommConfig,
        title: {
            show: true,
            text: 'Net IO Bytes'
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (v) => (bps_axis_formatter(v))
            }
        },
        tooltip: {
            trigger: 'axis',
            formatter: v => {
                if (v.length > 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${bps_formatter(v[0].value[1])} </span> <br/> ${v[1].seriesName}: <span class='tip-echarts'> ${bps_formatter(v[1].value[1])} </span>`
                }
                else if (v.length === 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${bps_formatter(v[0].value[1])} </span>`
                }
                return ''
            }
        },
        series: [{
            name: 'Recv bytes',
            data: data.net_bytes[0],
            type: 'line',
            symbol: 'diamond',
            showSymbol: false,
            smooth: 0.9,
            smoothMonotone: 'x',
            sampling: 'max',
            lineStyle: {
                width: 0,
            },
            areaStyle: areaStyle1,
        },
        {
            name: 'Send bytes',
            data: data.net_bytes[1],
            type: 'line',
            symbol: 'triangle',
            showSymbol: false,
            smooth: 0.9,
            smoothMonotone: 'x',
            sampling: 'max',
            lineStyle: {
                width: 0,
            },
            areaStyle: areaStyle2,
        }
        ]
    }

    const NetIOConfig = {
        ...CommConfig,
        title: {
            show: true,
            text: 'Net IOPS'
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (v) => (iops_formatter(v))
            }
        },
        tooltip: {
            trigger: 'axis',
            formatter: v => {
                if (v.length > 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${iops_formatter(v[0].value[1])} </span> <br/> ${v[1].seriesName}: <span class='tip-echarts'> ${iops_formatter(v[1].value[1])} </span>`
                }
                else if (v.length === 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${iops_formatter(v[0].value[1])} </span>`
                }
                return ''
            }
        },
        series: [{
            name: 'Recv IOPS',
            data: data.net_io[0],
            type: 'line',
            symbol: 'diamond',
            showSymbol: false,
            smooth: 0.9,
            smoothMonotone: 'x',
            sampling: 'max',
            lineStyle: {
                width: 0,
            },
            areaStyle: areaStyle1,
        },
        {
            name: 'Send IOPS',
            data: data.net_io[1],
            type: 'line',
            symbol: 'triangle',
            showSymbol: false,
            smooth: 0.9,
            smoothMonotone: 'x',
            sampling: 'max',
            lineStyle: {
                width: 0,
            },
            areaStyle: areaStyle2,
        }
        ]
    }


    const cardStyle = {
    }
    const [chartStyle, setChartStyle] = useState(getChartStyle(document.getElementById('rightPanel').clientWidth))
    const [needUpdate, setNeedUpdate] = useState(0)

    useEventListener('resize', () => {
        const e = document.getElementById('rightPanel')
        setChartStyle(getChartStyle(e.clientWidth))
    })


    useEffect(() => {
        async function run() {
            setData(data => ({ ...data, loading: true }))

            // timestamp cpu(%) mem(KiB) net_in(bps) net_out(bps) net_in(iops) net_out(iops)
            // block_read(bps) block_write(bps) block_read(iops) block_write(iops)
            let ret_data = await get_monitor_vm(props.vm, props.timerange)

            let cpu = []
            let mem = []
            let net_io = [[], []]
            let net_bytes = [[], []]
            let block_io = [[], []]
            let block_bytes = [[], []]

            for (const dt of ret_data) {
                let time = dt[0] * 1000
                cpu.push([time, dt[1] / 100])
                mem.push([time, dt[2] * 4 * 1024])

                block_bytes[0].push([time, dt[7] * 8])
                block_bytes[1].push([time, -dt[8] * 8])

                block_io[0].push([time, dt[9]])
                block_io[1].push([time, -dt[10]])

                net_bytes[0].push([time, dt[3] * 8])
                net_bytes[1].push([time, -dt[4] * 8])
                net_io[0].push([time, dt[5]])
                net_io[1].push([time, -dt[6]])
            }

            setData({ loading: false, cpu, mem, block_io, block_bytes, net_io, net_bytes })
        }
        run()
    }, [props.vm, props.timerange, needUpdate])

    const interval = props.active ? props.interval * 1000 : null

    useInterval(() => {
        setNeedUpdate(v => { return v + 1 })
    }, interval)

    return (
        <Fragment>
            <Divider />
            <Spin spinning={data.loading}>
                <Row gutter={[16, 16]}>
                    <Col>
                        <Card size='small' style={cardStyle}>
                            <ReactEcharts theme='theme' style={chartStyle} option={CPULineConfig} />
                        </Card>
                    </Col>
                    <Col>
                        <Card size='small' style={cardStyle}>
                            <ReactEcharts theme='theme' style={chartStyle} option={MemLineConfig} />
                        </Card>
                    </Col>
                    <Col>
                        <Card size='small' style={cardStyle}>
                            <ReactEcharts theme='theme' style={chartStyle} option={IOConfig} />
                        </Card>
                    </Col>
                    <Col>
                        <Card size='small' style={cardStyle}>
                            <ReactEcharts theme='theme' style={chartStyle} option={IOBytesConfig} />
                        </Card>
                    </Col>
                    <Col>
                        <Card size='small' style={cardStyle}>
                            <ReactEcharts theme='theme' style={chartStyle} option={NetIOConfig} />
                        </Card>
                    </Col>
                    <Col>
                        <Card size='small' style={cardStyle}>
                            <ReactEcharts theme='theme' style={chartStyle} option={NetBytesConfig} />
                        </Card>
                    </Col>
                </Row>
            </Spin>
        </Fragment>

    )
}

const MonitorVM = (props) => {
    const vm = queryString.parse(props.location.search).vm
    const [initVal] = useState({ interval: 60, timerange: [moment().subtract(7, 'd'), moment()], vm: vm })
    const [vmList, setVmList] = useState({ loading: false, list: [] })
    const [selectVm, setSelectVm] = useState(null)
    const [form] = Form.useForm()

    const vmRef = useRef()
    vmRef.current = vmList

    const onInputChange = async (v, full_value) => {
        if (!full_value.vm || !full_value.interval || !full_value.timerange) {
            return
        }
        if (!full_value.interval || full_value.interval < 1) {
            full_value.interval = 1
        }
        let timerange = [null, null]
        if (full_value.timerange[0]) {
            timerange[0] = Math.floor(full_value.timerange[0] / 1000)
        }
        if (full_value.timerange[1]) {
            timerange[1] = Math.floor(full_value.timerange[1] / 1000)
        }
        let sam = vmRef.current.list.find(v => v.name === full_value.vm)
        setSelectVm({
            ...sam, interval: full_value.interval,
            timerange
        })
    }


    useEffect(() => {
        async function run() {
            setVmList({ loading: true, list: [] })
            const data = await get_all_vm()
            setVmList({ loading: false, list: data })
            if (vm && data.find(v => { return v.name === vm })) {
                setTimeout(() => {
                    onInputChange(null, initVal)
                }, 300)
            }
        }
        run()
    }, [vm, initVal])

    return (
        <div>
            <ProgressHint size={24} interval={selectVm ? selectVm.interval : 0} />
            <Form form={form} initialValues={initVal} onValuesChange={onInputChange}>
                <Row gutter={[12, 12]}>
                    <Col>
                        <Form.Item label='Select VM' name='vm'>
                            <Select allowClear style={{ minWidth: 200, textAlign: 'left' }}>
                                {
                                    vmList.list.map(v => (
                                        <Select.Option value={v.name} key={v.name}>
                                            {v.name}
                                        </Select.Option>
                                    ))
                                }
                            </Select>
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item label='Interval (second)' name='interval'>
                            <InputNumber />
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item label='Timerange' name='timerange'>
                            <DatePicker.RangePicker showTime allowEmpty={[true, true]} format="YYYY-MM-DD HH:mm:ss" />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            {
                selectVm && (
                    <Fragment>
                        <div style={{ textAlign: 'left' }}>
                            Address: &nbsp;
                            <Typography.Text copyable>
                                {selectVm.ip}:{selectVm.port}
                            </Typography.Text>
                        </div>
                        <MonitorVMChart active={props.active} vm={selectVm.name} interval={selectVm.interval} timerange={selectVm.timerange} />
                    </Fragment>
                )
            }
        </div >
    )
}

export default withRouter(MonitorVM)