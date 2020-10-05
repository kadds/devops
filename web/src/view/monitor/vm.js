import React, { useState, useEffect, Fragment, useCallback } from 'react'
import { Row, Col, Card, Select, Spin, InputNumber, Divider } from 'antd'
import { Line, DualAxes, Area } from '@ant-design/charts'
import { get_all_vm } from '../../api/vm'
import { get_monitor_vm } from '../../api/monitor'


const CommConfig = {
    padding: 'auto',
    xField: 'time',
    xAxis: {
        type: 'time',
        tickCount: 50,
        line: { visible: true },
    },
    style: {
        width: 500,
        height: 300
    },
}

const MonitorVMChart = (props) => {
    const [data, setData] = useState({ loading: false, cpu: [], mem: [], block: [], net: [[], []], restart: [] })
    const CPULineConfig = {
        ...CommConfig,
        yField: 'cpu',
        yAxis: {
            min: 0,
            max: 100,
            label: {
                formatter: v => (v + ' %')
            }
        },
        data: data.cpu
    }

    const MemLineConfig = {
        ...CommConfig,
        yField: 'mem',
        yAxis: {
            min: 0,
            label: {
                formatter: (v) => {
                    if (v < 1024) {
                        return `${v} KiB`
                    }
                    else if (v < 1024 * 1024) {
                        return `${(v / 1024).toFixed(1)} MiB`
                    }
                    else {
                        return `${(v / 1024 / 1024).toFixed(1)} GiB`
                    }
                },
            },
        },
        color: '#90cecf',
        data: data.mem
    }

    const IOConfig = {
        ...CommConfig,
        yField: 'io',
        yAxis: {
            min: 0,
        },
        seriesField: 'type',
        legend: {
            position: 'right-top',
        },
        data: data.block
    }

    const NetIOConfig = {
        xField: 'time',
        style: {
            width: 500,
            height: 300
        },
        yField: ['io', 'bytes'],
        geometryOptions: [
            { geometry: 'line' },
            {
                geometry: 'line',
            },
        ],
        data: data.net
    }

    const RestartLineConfig = {
        ...CommConfig,
        yField: 'restart',
        yAxis: {
            min: 0,
        },
        smooth: true,
        color: '#faacae',
        data: data.restart
    }

    const cardStyle = {
    }

    useEffect(() => {
        async function run() {
            setData(data => ({ ...data, loading: true }))

            let ret_data = await get_monitor_vm(props.vm)
            // timestamp cpu(%) mem(KiB) net_in(KiB) net_in_package net_out(KiB) net_out_package block_in_package block_out_package restart
            const cpu = ret_data.map(v => { return { time: v[0] * 1000, cpu: v[1] / 100 } })
            let net = [[], []]
            net[0].length = 0
            net[1].length = 0
            let block = []

            let min_mem = 100000000000, max_mem = 0
            for (const dt of ret_data) {
                min_mem = Math.min(min_mem, dt[2])
                max_mem = Math.max(max_mem, dt[2])
                block.push({ time: dt[0] * 1000, io: dt[7], type: 'read' })
                block.push({ time: dt[0] * 1000, io: dt[8], type: 'write' })
                net[0].push({ time: dt[0] * 1000, io: dt[4], type: 'in', bytes: dt[5] })
                //net[0].push({ time: dt[0] * 1000, io: dt[6], type: 'out' })
                net[1].push({ time: dt[0] * 1000, bytes: dt[5], type: 'in', io: dt[4] })
                //net[1].push({ time: dt[0] * 1000, bytes: dt[7], type: 'out' })
            }
            // 1g
            const mem = ret_data.map(v => {
                return { time: v[0] * 1000, mem: v[2] }
            })

            const restart = ret_data.map(v => { return { time: v[0] * 1000, restart: v[9] } })

            setData({ loading: false, cpu, mem, block, net, restart })
        }
        run()
    }, [props.vm])

    return (
        <Fragment>
            <Divider />
            <Spin spinning={data.loading}>
                <Row gutter={[16, 16]}>
                    <Col>
                        <Card size='small' style={cardStyle} title='CPU'>
                            <Line {...CPULineConfig} />
                        </Card>
                    </Col>
                    <Col>
                        <Card size='small' style={cardStyle} title='Memory'>
                            <Line  {...MemLineConfig} />
                        </Card>
                    </Col>
                    <Col>
                        <Card size='small' style={cardStyle} title='Block IO'>
                            <Area {...IOConfig} />
                        </Card>
                    </Col>
                    <Col>
                        <Card size='small' style={cardStyle} title='Net IO'>
                            <DualAxes {...NetIOConfig} />
                        </Card>
                    </Col>
                    <Col>
                        <Card size='small' style={cardStyle} title='Restart'>
                            <Line {...RestartLineConfig} />
                        </Card>
                    </Col>
                </Row>
            </Spin>
        </Fragment>

    )
}

const MonitorVM = () => {
    const [vmList, setVmList] = useState({ loading: false, list: [] })
    const [selectVm, setSelectVm] = useState(null)


    const onSelect = useCallback(async (v) => {
        setSelectVm(v)
    }, [])

    useEffect(() => {
        async function run() {
            setVmList({ loading: true, list: [] })
            const data = await get_all_vm()
            setVmList({ loading: false, list: data })
            if (data.length) {
                setSelectVm(data[0].name)
            }
        }
        run()
    }, [onSelect])

    return (
        <div>
            <Row gutter={[16, 16]}>
                <Col>
                    <Spin spinning={vmList.loading}>
                        <Select value={selectVm} style={{ minWidth: 200, textAlign: 'left' }} onChange={onSelect}>
                            {
                                vmList.list.map(v => (
                                    <Select.Option value={v.name} key={v.name}>
                                        {v.name}
                                    </Select.Option>
                                ))
                            }
                        </Select>
                    </Spin>
                </Col>
                <Col>
                    <InputNumber defaultValue={1000}>
                    </InputNumber>
                </Col>
            </Row>
            {
                selectVm && (
                    <MonitorVMChart vm={selectVm} />
                )
            }
        </div>
    )
}

export default MonitorVM