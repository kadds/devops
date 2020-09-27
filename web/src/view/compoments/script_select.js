import React, { useEffect, useState } from 'react'
import { Spin, List, Row, Input, Form, Modal, Col, Alert } from 'antd'
import { get_scripts, get_script, upload_script } from '../../api/upload'
const TextArea = Input.TextArea;


const ScriptSelect = (props) => {
    const [scriptList, setScriptList] = useState([])
    const [contentLoading, setContentLoading] = useState(false)

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
    }, [props.visible])


    const listClick = async (e) => {
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
            <Row>
                <Col span={4}>
                    <List
                        className='select_script_list'
                        dataSource={scriptList}
                        renderItem={item => (
                            <List.Item className='select_script_list_item' key={item} onClick={() => listClick(item)} onDoubleClick={() => listDoubleClick(item)}>
                                <span style={{ cursor: 'pointer' }} >{item}</span>
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
