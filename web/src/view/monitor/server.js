import React, { useState, useEffect, Fragment } from 'react'
import { Divider, Row, Col, Spin, Select, InputNumber } from 'antd'
import { get_server_list } from './../../api/server'

const MonitorServerChart = (props) => {
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
    const onSelect = (v) => {
        setSelectServer(v)
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
            <Row gutter={[16, 16]}>
                <Col>
                    <Spin spinning={serverList.loading}>
                        <Select style={{ minWidth: 200, textAlign: 'left' }} onChange={onSelect}>
                            {
                                serverList.list.map(v => (
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
                selectServer && (
                    <MonitorServerChart server={selectServer} />
                )
            }
        </div>
    )
}

export default MonitorServer
