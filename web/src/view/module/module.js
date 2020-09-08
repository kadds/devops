import React, { useState, useEffect, createRef } from 'react'
import { Button, Spin, Row, Select, Table, Input, Form, Modal, InputNumber, message, Col } from 'antd'
import { add_module, get_module_list, update_module } from '../../api/module'
import { user_list } from '../../api/user'
import ScriptSelect from '../compoments/script_select'
import Server from '../server/server'

const { Option } = Select

const Module = () => {
    const [state, setState] = useState({ visible: false, type: 0, loading: false, need_update: 0 })
    const [data, setData] = useState([])
    const [userlistData, setUserlistData] = useState([])

    const [detail, setDetail] = useState({ show: false, name: null })

    const addModule = () => {
        setState({ ...state, visible: true, type: 0, loading: false })
    }

    const [form] = Form.useForm()

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
        if (state.type === 0) {
            await add_module(val)
            // ok
            message.info('Create module done!')
            setState({ ...state, loading: false, visible: false, need_update: state.need_update + 1 })
        }
        else {
            const ret = await update_module(val)
            // ok
            message.info('Update module done!')
            setState({ ...state, loading: false, visible: false, need_update: state.need_update + 1 })
        }
    }
    const onModalCancel = () => {
        setState({ ...state, visible: false })
    }


    const [showSelectVal, setShowSelectVal] = useState({ show: false, tag: '' })
    const onSelect = (val) => {
        if (showSelectVal.tag !== 'run') {
            // compilation
            form.setFieldsValue({
                ...form.getFieldValue(),
                compilation_script: val,
            })
        }
        else {
            // running
            form.setFieldsValue({
                ...form.getFieldValue(),
                run_script: val,
            })
        }
        setShowSelectVal({ show: false, tag: '' })
    }
    const onSelectCancel = () => {
        setShowSelectVal({ show: false, tag: '' })
    }

    const editClick = (e) => {
        form.setFieldsValue({
            name: e.name,
            dev_user: e.dev_user,
            compilation_env_img: e.compilation_env_img,
            env_img: e.env_img,
            run_script: e.run_script,
            compilation_script: e.compilation_script,
        })
        setState({ ...state, visible: true, type: 1, loading: false })
    }

    const onComClick = () => {
        setShowSelectVal({ show: true, tag: 'com' })
    }

    const onRunClick = () => {
        setShowSelectVal({ show: true, tag: 'run' })
    }

    const detailClick = (name) => {
        setDetail({ show: true, name })
    }

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: text => <Button type="link" onClick={() => detailClick(text)}>{text}</Button>
        },
        {
            title: 'User',
            dataIndex: 'dev_user',
            key: 'dev_user',
            render: text => <span>{text}</span>
        },
        {
            title: 'Server count',
            dataIndex: 'num',
            key: 'num',
        },
        {
            title: 'Create time',
            dataIndex: 'ctime',
            key: 'ctime',
            render: text => <span>{new Date(text).toLocaleString()}</span>
        },
        {
            title: 'Op',
            dataIndex: 'name',
            key: 'name',
            render: (i, r) => (<span><Button onClick={() => editClick(r)}>Edit</Button></span>)
        }
    ]

    useEffect(() => {
        async function run() {
            const list = await get_module_list()
            setData(list)
        }
        run()
    }, [state.need_update])

    useEffect(() => {
        async function run() {
            setUserlistData(await user_list())
        }
        run()
    }, [state.need_update])

    return (
        <div>
            <Row gutter={20}>
                <Col flex={'1 1 50%'}>
                    <div style={{ textAlign: 'left' }}>
                        <Button type='primary' onClick={addModule}>Add</Button>
                    </div>
                    <Table dataSource={data} columns={columns}></Table>
                </Col>
                {
                    detail.show && (<Col flex={'1 1 50%'}>
                        <Server mode_name={detail.name}> </Server>
                    </Col>)
                }
            </Row>
            <Modal
                visible={state.visible}
                title='Create/Edit Module'
                okText='Save'
                cancelText='Cancel'
                onOk={onModalOk}
                onCancel={onModalCancel}
                confirmLoading={state.loading}
                centered
            >
                <Form form={form}>
                    <Form.Item label='Name' name='name' rules={[{ required: true, message: 'Please input name' }]}>
                        <Input disabled={state.type != 0} />
                    </Form.Item>
                    <Form.Item label='User' name='dev_user' rules={[{ required: true, message: 'Please select dev user' }]}>
                        <Select>
                            {userlistData && userlistData.map(v => (
                                <Option key={v.username} value={v.username}>{v.username}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item label='Compilation docker image' name='compilation_env_img' rules={[{ required: true, message: 'Please input docker image name' }]} >
                        <Input />
                    </Form.Item>
                    <Form.Item label='Run docker image' name='env_img' rules={[{ required: true, message: 'Please input docker image name' }]} >
                        <Input />
                    </Form.Item>
                    <Form.Item label='Compilation script' name='compilation_script' rules={[{ required: true, message: 'Please input docker image name' }]}>
                        <Input.Search enterButton='Select' onSearch={onComClick}></Input.Search>
                    </Form.Item>
                    <Form.Item label='Run script' name='run_script' rules={[{ required: true, message: 'Please input docker image name' }]}>
                        <Input.Search enterButton='Select' onSearch={onRunClick}></Input.Search>
                    </Form.Item>
                </Form>

            </Modal>
            <ScriptSelect onSelect={onSelect} visible={showSelectVal.show} onCancel={onSelectCancel}>
            </ScriptSelect>
        </div>
    )
}

export default Module
