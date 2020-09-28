import React, { useEffect, useState } from 'react'
import { Spin, List, Typography, Row, Input, Form, Modal, Col, Alert, Popconfirm, Tooltip } from 'antd'
import { get_scripts, get_script, upload_script, delete_script } from '../../api/upload'
import { CloseOutlined, QuestionCircleOutlined } from '@ant-design/icons'

const TextArea = Input.TextArea;


const ScriptSelect = (props) => {
    const [scriptList, setScriptList] = useState([])
    const [contentLoading, setContentLoading] = useState(false)
    const [needUpdate, setNeedUpdate] = useState(0)

    const [form] = Form.useForm()
    const onModalOk = async () => {
        let val
        try {
            val = await form.validateFields()
        }
        catch (e) {
            return
        }
        await upload_script(val.name, val.content)

        props.onSelect(val.name)
    }
    const onModalCancel = () => {
        props.onCancel()
    }

    useEffect(() => {
        async function run() {
            setScriptList(await get_scripts())
        }
        if (props.visible)
            run()
    }, [props.visible, needUpdate])


    const listClick = async (e) => {
        console.log(e, 'list click')
        setContentLoading(true)
        const data = await get_script(e)
        setContentLoading(false)
        form.setFieldsValue({
            name: e,
            content: data
        })
    }

    const listDoubleClick = (e) => {
        props.onSelect(e)
    }

    const onDeleteClick = async (e, item) => {
        await delete_script(item)
        setNeedUpdate(needUpdate + 1)
    }

    const CancelClick = (e) => {
        e.stopPropagation()
        e.nativeEvent.stopImmediatePropagation()
    }

    return (
        <Modal
            visible={props.visible}
            title={props.title}
            okText='Confirm'
            cancelText='Cancel'
            onOk={onModalOk}
            onCancel={onModalCancel}
            centered
            width='70%'
        >
            <Row gutter={12}>
                <Col span={6}>
                    <List
                        style={{ height: 100, overflowY: 'auto' }}
                        className='select_script_list'
                        dataSource={scriptList}
                        renderItem={item => (
                            <List.Item className='select_script_list_item' key={item} onClick={() => listClick(item)} onDoubleClick={() => listDoubleClick(item)}>
                                <Typography.Text ellipsis className='select_script_list_item_label'>
                                    <Tooltip title={item}>{item}</Tooltip>
                                </Typography.Text>
                                <div onClick={CancelClick}
                                    onDoubleClick={CancelClick} >
                                    <Popconfirm title={
                                        <span><p>Are you sure delete this script? </p><p>It can make mistakes when pipeline using this script.</p></span>}
                                        onConfirm={(e) => onDeleteClick(e, item)} icon={<QuestionCircleOutlined style={{ color: 'red' }} />}>
                                        <CloseOutlined className='icon_btn' />
                                    </Popconfirm>
                                </div>
                            </List.Item>
                        )}>
                    </List>
                </Col>
                <Col flex={1}>
                    <Form form={form}>
                        <Form.Item label='Name' name='name' rules={[{ required: true, message: 'Please input name' }]}>
                            <Input placeholder="Name" bordered={false}></Input>
                        </Form.Item>
                        <Spin spinning={contentLoading}>
                            <Form.Item label="text" name="content">
                                <TextArea autoSize={{ minRows: 10 }}>
                                </TextArea>
                            </Form.Item>
                        </Spin>
                    </Form>
                </Col>
            </Row>
            <Row>

                <Alert type="warning" message="Note: Modifying an existing script affects all systems that use that script."></Alert>
            </Row>
        </Modal >
    )
}

export default ScriptSelect
