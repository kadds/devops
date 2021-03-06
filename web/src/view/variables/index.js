import React, { useState, useEffect } from 'react'
import { Tag, Form, Modal, Button, Table, Input, Row, Col, Checkbox } from 'antd'
import {DeleteOutlined} from '@ant-design/icons'
import { get_variables, new_variable, rm_variable, search_variables } from '../../api/variable'
import queryString from 'query-string'

const VariableIndex = (props) => {
    const [form] = Form.useForm()
    const [needUpdate, setNeedUpdate] = useState(0)
    const [modal, setModal] = useState({show: false, loading: false})
    const [data, setData] = useState([])

    const onDelete = async (name) => {
        await rm_variable(name)
        setNeedUpdate(needUpdate + 1)
    }

    const onNewVariable = () => {
        setModal({show: true, loading: false})
    }
    useEffect(() => {
        if (queryString.parse(props.location.search).new) {
            setTimeout(() => onNewVariable())
        }
    }, [props.location.search])

    useEffect(() => {
        async function run() {
            const data = await get_variables()
            setData(data)
        }
        run()
    }, [needUpdate])

    const onSearch = async (v) => {
        const data = await search_variables(v)
        setData(data)
    }


    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'Value',
            dataIndex: 'value',
            key: 'value',
            render: (v, r) => {
                if (v === null) {
                    return (<Tag color="warning">hide</Tag>)
                }
                else {
                    return v
                }
            }
        },
        {
            title: 'Options',
            key: 'name',
            dataIndex: 'name',
            render: (_, r) => {
                return (
                <Row gutter={[12,12]}>
                        <Col>
                            <Button type='link' icon={<DeleteOutlined/>} onClick={() => onDelete(r.name)} danger>Delete</Button>
                        </Col>
                </Row>)
            }
        }
    ]

    const onModalOk = async () => {
        setModal({show: true, loading: true})
        let val = null
        try {
            val = await form.validateFields()
            await new_variable(val.name, val.value, val.flag ? 1 : 0)
            setModal({show: false, loading: false})
            setNeedUpdate(needUpdate + 1)
        }
        catch{
            setModal({show: true, loading: false})
            return
        }
    }

    const onModalCancel = () => {
        setModal({show: false, loading: false})
    }

    return (
        <div className='page'>
            <Row gutter={[16, 16]}>
                <Col>
                    <Button onClick={onNewVariable} type='primary'>Add</Button>
                </Col>
                <Col>
                    <Input.Search onSearch={onSearch} allowClear enterButton></Input.Search>
                </Col>
            </Row>
            <Table dataSource={data} rowKey='name' columns={columns}>
            </Table>
            <Modal 
                title='Variable'
                visible={modal.show}
                confirmLoading={modal.loading}
                onOk={onModalOk}
                onCancel={onModalCancel}
                centered
            >
                <Form form={form}>
                    <Form.Item label='Name' name='name'>
                        <Input/>
                    </Form.Item>
                    <Form.Item label='Value' name='value'>
                        <Input/>
                    </Form.Item>
                    <Form.Item label='Flag' name='flag' valuePropName="checked">
                        <Checkbox > Private </Checkbox>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}

export default VariableIndex