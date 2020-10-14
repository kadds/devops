import React, { useState, useEffect, Fragment } from 'react'
import { Divider, Row, Card, Col, Form, DatePicker, Spin, Select, InputNumber } from 'antd'
import { get_server_list } from './../../api/server'
import { get_monitor_server } from './../../api/monitor'
import ReactEcharts from 'echarts-for-react'
import moment from 'moment'
import { useInterval, useEventListener } from '../../comm/util'
import echarts from 'echarts'
import ThemeJson from '../../theme.json'

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

const size_formatter = (v) => {
    if (v <= 0) {
        return '0'
    }
    else if (v < 1024) {
        return `${v} KiB`
    }
    else if (v < 1024 * 1024) {
        return `${(v / 1024).toFixed(1)} MiB`
    }
    else {
        return `${(v / (1024 * 1024)).toFixed(1)} GiB`
    }
}

const MonitorServerChart = (props) => {
    const [needUpdate, setNeedUpdate] = useState(0)
    const [data, setData] = useState({ loading: false, cpu: [], mem: [[], []], tcp: [] })
    useEffect(() => {
        async function run() {
            setData(v => { return { ...v, loading: true } })
            const data = await get_monitor_server(props.server, props.timerange)
            setData({
                cpu: data.map(v => { return [v[0], v[1] / 100] }),
                mem: [data.map(v => { return [v[0], v[2]] }), data.map(v => { return [v[0], v[3]] })],
                tcp: data.map(v => { return [v[0], v[4]] }),
                loading: false,
            })
        }
        run()
    }, [props.server, props.timerange, needUpdate])

    useInterval(() => {
        setNeedUpdate(v => { return v + 1 })
    }, props.interval * 1000)

    const cardStyle = {
    }
    const [chartStyle, setChartStyle] = useState(getChartStyle(document.getElementById('rightPanel').clientWidth))

    useEventListener('resize', () => {
        const e = document.getElementById('rightPanel')
        setChartStyle(getChartStyle(e.clientWidth))
    })

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
            smooth: true,
            sampling: 'max',
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
            formatter: v => {
                if (v.length > 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${size_formatter(v[0].value[1])} </span> <br/> ${v[1].seriesName}: <span class='tip-echarts'> ${size_formatter(v[1].value[1])} </span>`
                }
                else if (v.length === 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${size_formatter(v[0].value[1])} </span>`
                }
                return ''
            }
        },
        series: [{
            name: 'Memory used Phy',
            data: data.mem[0],
            type: 'line',
            symbol: 'diamond',
            showSymbol: false,
            smooth: true,
            sampling: 'max',
        },
        {
            name: 'Memory used Virtual',
            data: data.mem[1],
            type: 'line',
            symbol: 'diamond',
            showSymbol: false,
            smooth: true,
            sampling: 'max',
        }
        ],
    }

    const TCPConfig = {
        ...CommConfig,
        title: {
            show: true,
            text: 'TCP connection count'
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                formatter: (v) => (Math.abs(v))
            }
        },
        tooltip: {
            trigger: 'axis',
            formatter: v => {
                if (v.length === 1) {
                    return `${v[0].axisValueLabel}<br/> ${v[0].seriesName}: <span class='tip-echarts'> ${(v[0].value[1])} </span>`
                }
                return ''
            }
        },
        series: [{
            name: 'TCP count',
            data: data.tcp,
            type: 'line',
            symbol: 'diamond',
            showSymbol: false,
            smooth: true,
            sampling: 'max',
            lineStyle: {
                width: 2,
            },
        },
        ]
    }


    // todo
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
                            <ReactEcharts theme='theme' style={chartStyle} option={TCPConfig} />
                        </Card>
                    </Col>
                </Row>
            </Spin>
        </Fragment>
    )
}

const MonitorServer = () => {
    const [serverList, setServerList] = useState({ loading: false, list: [] })
    const [selectServer, setSelectServer] = useState(null)
    const [form] = Form.useForm()

    const onInputChange = async (v, full_value) => {
        if (!full_value.servers || !full_value.interval || !full_value.timerange || !full_value.servers.length) {
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

        setSelectServer({
            servers: full_value.servers, interval: full_value.interval,
            timerange
        })
    }


    useEffect(() => {
        async function run() {
            setServerList({ loading: true, list: [] })
            const data = await get_server_list()
            setServerList({ loading: false, list: data })
        }
        run()
    }, [])

    return (
        <div>
            <Form form={form} initialValues={{ interval: 60, timerange: [moment().subtract(7, 'd'), moment()] }} onValuesChange={onInputChange}>
                <Row gutter={[12, 12]}>
                    <Col>
                        <Form.Item label='Select Server' name='servers'>
                            <Select allowClear mode="multiple" style={{ minWidth: 200, textAlign: 'left' }}>
                                {
                                    serverList.list.map(v => (
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
                selectServer && (
                    <MonitorServerChart server={selectServer.servers} interval={selectServer.interval} timerange={selectServer.timerange} />
                )
            }
        </div>
    )
}

export default MonitorServer
