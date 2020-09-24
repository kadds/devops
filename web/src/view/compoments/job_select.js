
import React, { useEffect, useState } from 'react'
import { Button, Row, Tag, Input, Form, Modal, message, Col, Typography, Alert, Card, Badge } from 'antd'
import { get_jobs, jobs_valid } from '../../api/pipeline'

const get_map = (joblist) => {
    let map = new Map()
    map.set('env', { readonly: true })
    map.set('source', { readonly: true })
    map.set('build', { readonly: true })
    map.set('deploy', { readonly: true })
    let cnt = 1
    let has = false
    for (let job of joblist.env) {
        map.set(job.name, { cnt: cnt })
        has = true
        cnt++
    }
    if (has) {
        map.set('env', { readonly: true })
        map.set('source', { readonly: false })
    }
    else {
        map.set('env', { readonly: false })
    }
    has = false
    for (let job of joblist.source) {
        map.set(job.name, { cnt: cnt })
        has = true
        cnt++
    }
    if (has) {
        map.set('build', { readonly: false })
    }
    has = false
    for (let job of joblist.build) {
        map.set(job.name, { cnt: cnt })
        has = true
        cnt++
    }
    if (has) {
        map.set('deploy', { readonly: false })
    }
    has = false
    for (let job of joblist.deploy) {
        map.set(job.name, { cnt: cnt })
        has = true
        cnt++
    }
    if (has) {
        map.set('deploy', { readonly: false })
    }

    return map
}

const JobSelect = (props) => {
    const [avlJob, setAvlJob] = useState({ loading: false })
    const [param, setParam] = useState({ loading: false, visible: false, params: [], name: '' })
    const selectMap = get_map(props.joblist)

    useEffect(() => {
        async function run() {
            setAvlJob({ loading: true });
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
            setAvlJob({ list, loading: false })
        }
        run()
    }, [])

    const pform = Form.useForm()[0]

    const cardClick = (item) => {
        if (!props.editable || (selectMap.get(item.type).readonly && !selectMap.get(item.name))) {
            return
        }
        setParam({ loading: false, visible: true, params: item.params, name: item.name, item: item })
        let val = {}
        if (selectMap.get(item.name)) {
            const job = props.joblist[item.type].find(v => { return v.name === item.name })
            Object.entries(job.param).forEach((key, value) => { val[key] = value })
        }
        else {
            for (const p of item.params) {
                if (p.default)
                    val[p.name] = p.default
                else
                    val[p.name] = ''
            }
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

        for (let it of props.joblist[param.item.type]) {
            if (it.name === param.item.name) {
                it.param = val
                break
            }
        }
        let joblist = props.joblist
        if (!selectMap.get(param.item.name)) {
            joblist[param.item.type].push({ param: val, name: param.name })
        }
        setParam({ ...param, loading: false, visible: false, name: '' })
        props.onJobChange(joblist)
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

    const readonly = !props.editable

    const RenderCard = (props) => {
        return (
            <div style={{ marginTop: 12 }}>
                <Card size='small' onClick={() => { cardClick(props.item) }}
                    className={`card_normal ${selectMap.get(props.item.name) ? 'card_selected' : ''}
                    ${ readonly || selectMap.get(props.item.type).readonly ? 'card_readonly' : ''}`}
                    title={props.item.name} extra={
                        <div> {
                            props.item.tag.map(t => (<Tag key={t}>{t}</Tag>))
                        }
                            {selectMap.get(props.item.name) && (< Badge count={selectMap.get(props.item.name).cnt} >
                            </Badge>)
                            }
                        </div>
                    }
                >
                    <Typography.Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'more' }} style={{ width: '100%', marginBottom: 0 }}>
                        {props.item.description}
                    </Typography.Paragraph>
                </Card >
            </div >

        )
    }

    return (
        <Row gutter={16} style={{ maxHeight: '70%', overflow: 'auto' }}>
            <Col>
                <Typography.Text strong style={{ margin: '10 10', textAlign: 'center', display: 'block' }}>
                    Environment
                </Typography.Text>
                <div style={{ margin: '12px 12px 20px 20px' }}>
                    {
                        avlJob.list && avlJob.list.env && (
                            avlJob.list.env.map(env => (
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
                        avlJob.list && avlJob.list.source && (
                            avlJob.list.source.map(s => (
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
                        avlJob.list && avlJob.list.build && (
                            avlJob.list.build.map(s => (
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
                        avlJob.list && avlJob.list.deploy && (
                            avlJob.list.deploy.map(s => (
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