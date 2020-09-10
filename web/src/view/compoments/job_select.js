
import React, { useEffect, useState, useRef } from 'react'
import { Button, Spin, List, Row, Tag, Layout, Input, Form, Modal, InputNumber, message, Col, Typography, Collapse, Alert, Card, Badge } from 'antd'
import { get_jobs, jobs_valid } from '../../api/pipeline'

const base_style = {
}

const JobSelect = (props) => {
    const [jobList, setJobList] = useState({ loading: false })
    const [param, setParam] = useState({ loading: false, visible: false, params: [], name: '' })
    const [selectJobList, setSelectJobList] = useState({ env: [], source: [], build: [], deploy: [], count: 0 })

    useEffect(() => {
        async function run() {
            setJobList({ loading: true });
            const jobs = await get_jobs()
            let list = {}
            for (const v of jobs) {
                if (v.type === 'env') {
                    list.env = v.job
                }
                else if (v.type === 'source') {
                    list.source = v.job
                }
                else if (v.type === 'build') {
                    list.build = v.job
                }
                else if (v.type === 'deploy') {
                    list.deploy = v.job
                }
            }
            setJobList({ list })
        }
        run()
    }, [])

    const pform = Form.useForm()[0]

    const cardClick = (item) => {
        if (!props.editable) return
        setParam({ loading: false, visible: true, params: item.params, name: item.name, item: item })
        let val = {}
        for (const p of item.params) {
            if (p.default)
                val[p.name] = p.default
            else
                val[p.name] = ''
        }
        pform.setFieldsValue(val)
    }

    const onParamOk = async () => {
        setParam({ ...param, loading: true, err: undefined })
        let val = null
        try {
            val = await pform.validateFields()
        }
        catch (e) {
            setParam({ ...param, loading: false })
            return
        }
        let has_set = false
        for (let it of selectJobList[param.item.type]) {
            if (it.name === param.item.name) {
                has_set = true
                it.param = val
                break
            }
        }
        if (!has_set) {
            selectJobList.count += 1
            param.item.selectIdx = selectJobList.count
            selectJobList[param.item.type].push({ param: val, name: param.name })
        }
        setParam({ ...param, loading: false, visible: false, name: '' })
        setJobList({ loading: false, list: jobList.list })
        setSelectJobList(selectJobList)
        props.onJobChange({ env: selectJobList.env, build: selectJobList.build, source: selectJobList.source, deploy: selectJobList.deploy })
    }

    const onParamTest = async () => {
        setParam({ ...param, loading: true, err: undefined })
        let val = null
        try {
            val = await pform.validateFields()
        }
        catch (e) {
            setParam({ ...param, loading: false })
            return
        }
        const v = await jobs_valid(param.name, val)
        if (v !== '') {
            setParam({ ...param, loading: false, err: v + '' })
        }
        else {
            message.success('Test ok')
            setParam({ ...param, loading: false, err: null })
        }
    }

    const onParamCancel = () => {
        setParam({ ...param, loading: false, visible: false })
    }

    const RenderCardNone = (props) => {
        return (
            <Card size='small' onClick={() => { cardClick(props.item) }}
                className={'card_normal'} style={{ marginTop: 12 }}
                title={props.item.name} extra={
                    <div> {
                        props.item.tag.map(t => (<Tag key={t}>{t}</Tag>))
                    }
                    </div>
                } >
                <Typography.Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }} style={{ width: '100%', marginBottom: 0 }}>
                    {props.item.description}
                </Typography.Paragraph>
            </Card >
        )
    }

    const RenderCardSelect = (props) => {
        return (
            <div style={{ marginTop: 12 }}>
                <Badge count={props.item.selectIdx} >
                    <Card size='small' onClick={() => { cardClick(props.item) }}
                        className={'card_normal card_selected'}
                        title={props.item.name} extra={
                            <div> {
                                props.item.tag.map(t => (<Tag key={t}>{t}</Tag>))
                            }
                            </div>
                        } >
                        <Typography.Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }} style={{ width: '100%', marginBottom: 0 }}>
                            {props.item.description}
                        </Typography.Paragraph>
                    </Card >
                </Badge>
            </div>
        )
    }

    const RenderCard = (props) => {
        if (props.item.selectIdx) {
            return (
                <RenderCardSelect item={props.item} />
            )
        }
        else {
            return (
                <RenderCardNone item={props.item} />
            )
        }
    }

    return (
        <Row gutter={16} style={{ maxHeight: '70%', overflow: 'auto' }}>
            <Col>
                <Typography.Text strong style={{ margin: '10 10', textAlign: 'center', display: 'block' }}>
                    Environment
                </Typography.Text>
                <div style={{ margin: '12px 12px 20px 20px' }}>
                    {
                        jobList.list && jobList.list.env && (
                            jobList.list.env.map(env => (
                                <RenderCard key={env.name} item={env}></RenderCard>
                            ))
                        )
                    }
                </div>
            </Col>
            <Col>
                <Typography.Text strong style={{ margin: '10 10', textAlign: 'center', display: 'block' }}>
                    Source Code
                </Typography.Text>
                <div style={{ margin: '12px 12px 20px 20px' }}>
                    {
                        jobList.list && jobList.list.source && (
                            jobList.list.source.map(s => (
                                <RenderCard key={s.name} item={s}></RenderCard>
                            ))
                        )
                    }
                </div>
            </Col>
            <Col>
                <Typography.Text strong style={{ margin: '10 10', textAlign: 'center', display: 'block' }}>
                    Build
                </Typography.Text>
                <div style={{ margin: '12px 12px 20px 20px' }}>
                    {
                        jobList.list && jobList.list.build && (
                            jobList.list.build.map(s => (
                                <RenderCard key={s.name} item={s}></RenderCard>
                            ))
                        )
                    }
                </div>
            </Col>
            <Col>
                <Typography.Text strong style={{ margin: '10 10', textAlign: 'center', display: 'block' }}>
                    Deploy
                </Typography.Text>
                <div style={{ margin: '12px 12px 20px 20px' }}>
                    {
                        jobList.list && jobList.list.deploy && (
                            jobList.list.deploy.map(s => (
                                <RenderCard key={s.name} item={s}></RenderCard>
                            ))
                        )
                    }
                </div>
            </Col>
            <Modal
                visible={param.visible}
                title={'Edit parameter for ' + param.name}
                okText='Save'
                cancelText='Cancel'
                onOk={onParamOk}
                onCancel={onParamCancel}
                confirmLoading={param.loading}
                centered
                footer={[
                    <Button key="back" onClick={onParamCancel}>
                        Cancel
                    </Button>,
                    <Button key="test" onClick={onParamTest} loading={param.loading}>
                        Test
                    </Button>,
                    <Button key="submit" type="primary" loading={param.loading} onClick={onParamOk}>
                        Confirm
                    </Button>,
                ]}
            >
                <Form form={pform}>
                    {param.params.map(p => (
                        <Form.Item key={p.name} label={p.label} name={p.name}>
                            <Input></Input>
                        </Form.Item>
                    ))}
                </Form>
                {param.err && <Alert message='Error' description={param.err} type='error' showIcon />}
            </Modal>
        </Row>
    )

}
export default JobSelect