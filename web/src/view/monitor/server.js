import React, { useState, useEffect, Fragment } from 'react'
import { Divider, Row, Col, Form, DatePicker, Spin, Select, InputNumber } from 'antd'
import { get_server_list } from './../../api/server'
import { get_monitor_server } from './../../api/monitor'
import moment from 'moment'
import { useInterval } from '../../comm/util'

const MonitorServerChart = (props) => {
    const [needUpdate, setNeedUpdate] = useState(0)
    useEffect(() => {
        async function run() {
            const data = await get_monitor_server(props.server, props.timerange)
            console.log(data)
        }
        run()
    }, [props.server, props.timerange, needUpdate])

    useInterval(() => {
        setNeedUpdate(v => { return v + 1 })
    }, props.interval * 1000)

    // todo
    return (
        <Fragment>
            <Divider />
            <Row>
                <Col>
                </Col>
            </Row>
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
