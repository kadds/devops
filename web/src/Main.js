import React, { useState, useEffect, Fragment, Suspense } from 'react'
import { Route, Switch, NavLink } from 'react-router-dom'
import { Layout, BackTop, Menu, Avatar, Row, Col, Dropdown } from 'antd'
import { info, logout } from './api/user'
import { useHistory } from 'react-router'
import {
    UserOutlined,
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    LogoutOutlined,
    HddOutlined,
    HddFilled,
    CloudServerOutlined,
    GoldOutlined,
    GoldFilled,
    ThunderboltOutlined,
    ThunderboltFilled,
    FilterOutlined,
    FilterFilled,
    LineChartOutlined,
    DeploymentUnitOutlined,
    DashboardFilled,
    DashboardOutlined,
    SettingOutlined,
    SecurityScanOutlined,
} from '@ant-design/icons'

import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { withRouter } from 'react-router-dom'

const DashboardIndex = React.lazy(() => import('./view/dashboard/index'))
const PipeLineList = React.lazy(() => import('./view/pipeline/list'))
const PipeLineDetail = React.lazy(() => import('./view/pipeline/detail'))
const VM  = React.lazy(() => import('./view/vm/vm'))
const Module = React.lazy(() => import('./view/module/module'))
const ServerIndex = React.lazy(() => import('./view/server/index'))
const MonitorIndex = React.lazy(() => import('./view/monitor/index'))
const LogIndex = React.lazy(() => import('./view/log_view/index'))
const Deploy = React.lazy(() => import('./view/deploy/deploy'))
const Detail = React.lazy(() => import('./view/deploy/detail'))
const P404 = React.lazy(() => import('./view/P404'))
const Setting = React.lazy(() => import('./view/setting/index'))
const VariableIndex = React.lazy(() => import('./view/variables/index'))

const { Header, Sider, Content } = Layout;
const style = { fontSize: 17, verticalAlign: 'middle' }
const menus = [
    { name: 'Dashboard', icon: (<DashboardOutlined style={style} />), icon2: (<DashboardFilled style={style} />), path: '/index' },
    { name: 'Pipeline List', icon: (<ThunderboltOutlined style={style} />), icon2: (<ThunderboltFilled style={style} />), path: '/pipeline/list' },
    { name: 'Virtual Machine', icon: (<HddOutlined style={style} />), icon2: (<HddFilled style={style} />), path: '/vm' },
    { name: 'Module', icon: (<GoldOutlined style={style} />), icon2: (<GoldFilled style={style} />), path: '/module' },
    { name: 'Cloud Server', icon: (<CloudServerOutlined style={style} />), icon2: (<CloudServerOutlined style={style} />), path: '/server' },
    { name: 'Deployment', icon: (<DeploymentUnitOutlined style={style} />), icon2: (<DeploymentUnitOutlined style={style} />), path: '/deploy/list' },
    { name: 'Monitor', icon: (<LineChartOutlined style={style} />), icon2: (<LineChartOutlined style={style} />), path: '/monitor' },
    { name: 'Log', icon: (<FilterOutlined style={style} />), icon2: (<FilterFilled style={style} />), path: '/log' },
    { name: 'Variable', icon: (<SecurityScanOutlined style={style} />), icon2: (<SecurityScanOutlined style={style}/>), path: '/var'}
]

const contents = [
    { path: '/index', component: DashboardIndex, title: 'Dashboard' },
    { path: '/pipeline/list', component: PipeLineList, title: 'Pipeline list' },
    { path: '/pipeline/detail', component: PipeLineDetail, title: 'Pipeline detail' },
    { path: '/vm', component: VM, title: 'Virtual Machine' },
    { path: '/module', component: Module, title: 'Module Information' },
    { path: '/server', component: ServerIndex, title: 'Cloud Server' },
    { path: '/deploy/list', component: Deploy, title: 'Deploying list' },
    { path: '/deploy/detail', component: Detail, title: 'Deploying detail' },
    { path: '/monitor', component: MonitorIndex, title: 'Monitor' },
    { path: '/log', component: LogIndex, title: 'Log Query' },
    { path: '/var', component: VariableIndex, title: 'Variable'},
    { path: '/setting', component: Setting, title: 'Setting' },
    { component: P404 }
]

function Main(props) {
    const context = contents.find(v => { return v.path === props.history.location.pathname })
    if (context) {
        document.title = context.title
    }

    const onSettingClick = () => {
        props.history.push({ pathname: '/setting' })
    }

    const [collapsed, set_collapsed] = useState(false)
    const toggle = () => {
        set_collapsed(!collapsed)
    }

    const [user, set_user] = useState(null)
    useEffect(() => {
        async function run() {
            const user = await info()
            set_user(user)
        }
        run()
    }, [])

    const history = useHistory()
    const do_logout = async function () {
        await logout()
        setTimeout(() => {
            history.go(0)
        }, 200);
    }

    const userMenu = (
        <Menu>
            {user && (
                <Fragment>
                    <Menu.Item>
                        Username: {user.username}
                    </Menu.Item>
                    <Menu.Item onClick={do_logout} icon={<LogoutOutlined />}>
                        Logout
                        </Menu.Item>
                </Fragment>
            )
            }
        </Menu>
    )
    const MenuRender = (props) => {
        const [selectMenu, setSelectMenu] = useState(props.location.pathname)
        const onSelect = (e) => {
            setSelectMenu(e.key)
        }
        return (
            <Menu onSelect={onSelect} selectedKeys={[selectMenu]} style={{ height: '100%', overflowY: 'auto' }} theme="dark" mode="inline">
                {
                    menus.map(item => {
                        if (item.sub === undefined) {
                            return (
                                <Menu.Item key={item.path} icon={selectMenu === item.path ? item.icon2 : item.icon}>
                                    <NavLink activeClassName="active" className="nav-link" to={item.path}>
                                        {item.name}
                                    </NavLink>
                                </Menu.Item>
                            )
                        }
                        else {
                            return (
                                <Menu.SubMenu key={item.path} icon={item.icon} title={item.name}>
                                    <Menu.ItemGroup>
                                        {
                                            item.sub.map(item => (
                                                <Menu.Item key={item.path} icon={item.icon}>
                                                    <NavLink activeClassName="active" className="nav-link" to={item.path}>
                                                        {item.name}
                                                    </NavLink>
                                                </Menu.Item>
                                            ))
                                        }
                                    </Menu.ItemGroup>
                                </Menu.SubMenu>
                            )
                        }
                    })
                }
            </Menu>
        )
    }

    return (
        <Layout style={{ height: '100%' }}>
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <MenuRender location={props.location}></MenuRender>
            </Sider>
            <Layout className="site-layout" id='rightPanel' style={{ overflowX: 'visible', overflowY: 'auto' }}>
                <BackTop target={() => document.getElementById('rightPanel')} />
                <Header className="site-layout-background" style={{ padding: 0 }}>
                    <Row justify='space-between'>
                        <Col>
                            <Row gutter={16} style={{ marginLeft: 10 }}>
                                <Col>
                                    <span style={{ display: 'inline' }}>
                                        {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                                            className: 'trigger',
                                            onClick: toggle,
                                        })}
                                    </span>
                                </Col>
                                <Col>
                                    <span style={{ fontSize: 15, color: '#7a7a8a' }}>
                                        {document.title}
                                    </span>
                                </Col>
                            </Row>
                        </Col>
                        <Col>
                            <Row gutter={16} style={{ marginRight: 20 }}>
                                <Col>
                                    <SettingOutlined onClick={onSettingClick} />
                                </Col>
                                <Col>
                                    {
                                        user && (
                                            <Dropdown overlay={userMenu}>
                                                <Avatar style={{ backgroundColor: '#87d068', cursor: 'pointer' }} icon={<UserOutlined />} />
                                            </Dropdown>
                                        )
                                    }
                                </Col>
                            </Row>
                        </Col>
                    </Row>
                </Header>

                <Content
                    className="site-layout-background content-page-par"
                >
                    <TransitionGroup className='content-page'>
                        <CSSTransition
                            timeout={400}
                            classNames='page'
                            key={props.location.pathname}>
                            <Suspense fallback={<div className='page'>Loading...</div>}>
                                <Switch location={props.location}>
                                    {
                                        contents.map((v, index) => {
                                            return (
                                                <Route key={index} path={v.path} component={v.component}></Route>
                                            )
                                        })
                                    }
                                </Switch>
                            </Suspense>
                        </CSSTransition>
                    </TransitionGroup>
                </Content>
            </Layout>
        </Layout>
    );
}

export default withRouter(Main);