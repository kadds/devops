import React, { useEffect, useState } from 'react'
import { Form, Spin, Row, Col, InputNumber, Divider, DatePicker } from 'antd'
import queryString from 'querystring'
import { withRouter } from 'react-router'
import { get_call_graph } from '../../api/monitor'
import moment from 'moment'

const Call = (props) => {
    const tid = queryString.parse(props.location.search).tid
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [select, setSelect] = useState(null)
    const [initVal] = useState({ tid, timerange: [moment().subtract(1, 'd'), moment()] })

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
        console.log(select)
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
        let timerange = [null, null]
        if (full_value.timerange[0]) {
            timerange[0] = Math.floor(full_value.timerange[0] / 1000)
        }
        if (full_value.timerange[1]) {
            timerange[1] = Math.floor(full_value.timerange[1] / 1000)
        }

        setSelect({
            tid: full_value.tid + '',
            timerange
        })
    }



    return (
        <div>
            <Form form={form} onValuesChange={onInputChange} initialValues={initVal}>
                <Row gutter={[12, 12]}>
                    <Col>
                        <Form.Item name='tid' label="tid">
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