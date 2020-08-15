import React, { useState, useEffect, createRef } from 'react'
import { Button, Table, Input, Form, Modal, InputNumber, message } from 'antd'
import { add_vm } from '../../api/vm'

const VM = () => {
    const [show, setShow] = useState({ visible: false, type: 0 })
    const [loading, setLoading] = useState(false)
    const addVm = () => {
        setShow({ visible: true, type: 0 })
    }
    let form = createRef()
    const onModalOk = async () => {
        setLoading(true)
        const val = await form.current.validateFields()
        console.log(val)
        if (show.type === 0) {

            const ret = await add_vm({ vm: val })
            if (ret == 0) {
                // ok
                setLoading(false)
                message.info('Create VM done!')
                setShow({ visible: false, type: 0 })
            }
            else {
                message.error('VM connection test fail, check your ip/password', 4)
            }
        }
    }
    const onModalCancel = () => {
        setShow({ visible: false, type: 0 })
    }
    const columns = [
        {

        }
    ]
    return (
        <div>
            <Button type='primary' onClick={addVm}>Add</Button>
            <Table columns={columns}></Table>
            <Modal
                visible={show.visible}
                title='Create/Edit VM'
                okText='Save'
                cancelText='Cancel'
                onOk={onModalOk}
                onCancel={onModalCancel}
                loading={loading}
                centered
            >
                <Form ref={form}>
                    <Form.Item label='Name' name='name' rules={[{ required: true, message: 'Please input vm name' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label='IP/host' name='ip' rules={[{ required: true, message: 'Please input vm ip address' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item initialValue={22} label='Port' name='port' rules={[{ required: true, message: 'Please input vm port' }]}>
                        <InputNumber max={65535} />
                    </Form.Item>
                    <Form.Item label='Password' name='password'>
                        <Input />
                    </Form.Item>
                    <Form.Item label='Private Key' name='private_key'>
                        <Input type='text' />
                    </Form.Item>
                    <Form.Item label='User' name='user' rules={[{ required: true, message: 'Please input vm login username' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item label='Base Dir' name='base_dir' rules={[{ required: true, message: 'Please input base dir' }]}>
                        <Input />
                    </Form.Item>
                </Form>

            </Modal>
        </div>
    )
}

export default VM
