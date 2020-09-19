import React, { useState, useEffect } from 'react'
import { Table, Button, Popconfirm, Modal, Row, Col, Form, Select, Input } from 'antd'
import { get_pipelines, delete_pipeline, create_pipeline } from './../../api/pipeline'
import { withRouter } from 'react-router-dom';
import { get_module_list } from '../../api/module'
import { QuestionCircleOutlined } from '@ant-design/icons'


const PipeLineList = props => {
    const goClick = (id) => {
        props.history.push({ pathname: '/pipeline/detail/', id: id })
    }
    const [isDel, setIsDel] = useState(false)
    const [data, setData] = useState([])
    const [needUpdate, setNeedUpdate] = useState(0)

    const deleteClick = async (id) => {
        setIsDel(true)
        await delete_pipeline(id)
        setIsDel(false)
        setNeedUpdate(needUpdate + 1)
    }
    const columns = [
        {
            title: 'id',
            dataIndex: 'id',
            key: 'id',
            render: (id, r) => (
                <Button type='link' onClick={() => goClick(id)}>
                    {id}
                </Button>
            )
        },
        {
            title: 'module',
            dataIndex: 'mode_name',
            key: 'module',
            render: text => <span>{text}</span>
        },
        {
            title: 'Create time',
            dataIndex: 'ctime',
            key: 'ctime',
            render: text => <span>{new Date(text).toLocaleString()}</span>
        },
        {
            title: 'Operation',
            dataIndex: 'id',
            key: 'id',
            render: id => (<Popconfirm title="Are you sure？" onConfirm={() => deleteClick(id)} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                <Button danger loading={isDel}>Delete</Button></Popconfirm>)
        }
    ]


    useEffect(() => {
        async function run() {
            const list = await get_pipelines()
            setData(list)
        }
        run()
    }, [needUpdate])
    const [form] = Form.useForm()
    const [moduleList, setModuleList] = useState({ loading: false, list: [] })
    const [state, setState] = useState({ loading: false, visible: false })

    const addClick = async () => {
        setState({ loading: false, visible: true })
        setModuleList({ loading: true, list: [] })
        const list = await get_module_list()
        setModuleList({ loading: false, list })
    }

    const onModalOk = async () => {
        setState({ ...state, loading: true })
        let val
        try {
            val = await form.validateFields()
        }
        catch (e) {
            setState({ ...state, loading: false })
            return
        }
        if (!val.mode_name) val.mode_name = ''
        if (!val.mark) val.mark = ''
        await create_pipeline(val.mode_name, val.mark)
        setState({ loading: false, visible: false })
        setNeedUpdate(needUpdate + 1)
    }

    const onModalCancel = async () => {
        setState({ loading: false, visible: false })
    }
    return (
        <div>
            <Row><Col>
                <Button onClick={addClick} type='primary'>Add</Button></Col> </Row>
            <Table rowKey='id' dataSource={data} columns={columns}>
            </Table>
            <Modal
                visible={state.visible}
                title='Select module to execute pipeline'
                okText='Create'
                cancelText='Cancel'
                onOk={onModalOk}
                onCancel={onModalCancel}
                confirmLoading={state.loading}
                centered
            >
                <Form labelCol={{ span: 6 }} wrapperCol={{ flex: 1 }} form={form}>
                    <Form.Item label='Module name' name='mode_name' rules={[{ required: true, message: 'Please input module name' }]}>
                        <Select style={{ minWidth: 200, textAlign: 'left' }}>
                            {moduleList.list.map(v => (<Select.Option key={v.name}>{v.name}</Select.Option>))}
                        </Select>
                    </Form.Item>
                    <Form.Item label='Mark' name='mark'>
                        <Input.TextArea autoSize={{ minRows: 5, maxRows: 20 }}></Input.TextArea>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    )
}

export default withRouter(PipeLineList)
