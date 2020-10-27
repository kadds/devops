import React, { useEffect, useState } from 'react'
import { Form, Spin, Row, Col, Input, Divider, DatePicker } from 'antd'
import queryString from 'query-string'
import { withRouter } from 'react-router'
import { get_call_graph } from '../../api/monitor'
import moment from 'moment'

const Call = (props) => {
    const tid = queryString.parse(props.location.search).tid
    const time = parseInt(queryString.parse(props.location.search).time)
    let time_range
    if (time) {
        time_range = [moment(time - 100), moment(time).add(1, 'm')]
    }
    else {
        time_range = [moment().subtract(1, 'd'), moment()]
    }
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [initVal] = useState({ tid, timerange: time_range })
    const [select, setSelect] = useState(tid ? { tid, timerange: [time_range[0].valueOf(), time_range[1].valueOf()] } : null)
    const [form] = Form.useForm()

    useEffect(() => {
        async function run() {
            setLoading(true)
            try {
                const data = await get_call_graph(select.tid, select.timerange)
                setData(data)
            }
            finally {
                setLoading(false)
            }
        }
        if (select && select.tid)
            run()
    }, [select])

    const onInputChange = async (v, full_value) => {
        if (!full_value.tid || !full_value.timerange) {
            return
        }

        if (!full_value.interval || full_value.interval < 1) {
            full_value.interval = 1
        }
        console.log(full_value)
        let timerange = [null, null]
        if (full_value.timerange[0]) {
            timerange[0] = full_value.timerange[0].valueOf()
        }
        if (full_value.timerange[1]) {
            timerange[1] = full_value.timerange[1].valueOf()
        }

        setSelect({
            tid: full_value.tid,
            timerange
        })
    }

    return (
        <div>
            <Form form={form} onValuesChange={onInputChange} initialValues={initVal}>
                <Row gutter={[12, 12]}>
                    <Col>
                        <Form.Item name='tid' label="tid">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col>
                        <Form.Item label='Timerange' name='timerange'>
                            <DatePicker.RangePicker showTime allowEmpty={[true, true]} format="YYYY-MM-DD HH:mm:ss" />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
            <Divider />
            <Spin spinning={loading}>
                {
                    data && (
                        <div>data graph</div>
                    )
                }

            </Spin>
        </div>
    )
}

export default withRouter(Call)