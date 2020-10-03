import React, { useState, useEffect } from 'react'
import { Route, Switch, NavLink } from 'react-router-dom'
import { Layout, Menu, Avatar, Row, Col, Dropdown } from 'antd'
import { info, logout } from './api/user'
import {
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
} from '@ant-design/icons'
import PipeLineList from './view/pipeline/list'
import PipeLineDetail from './view/pipeline/detail'
import VM from './view/vm/vm'
import Module from './view/module/module'
import Server from './view/server/server'
import MonitorIndex from './view/monitor/index'
import LogIndex from './view/log_view/index'
import Deploy from './view/deploy/deploy'
import P404 from './view/P404'
import DashboardIndex from './view/dashboard/index'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { withRouter } from 'react-router-dom'

const { Header, Sider, Content } = Layout;
const style = { fontSize: 17, verticalAlign: 'middle' }
const menus = [
    { name: 'Dashboard', icon: (<DashboardOutlined style={style} />), icon2: (<DashboardFilled style={style} />), path: '/index' },
    { name: 'Pipeline List', icon: (<ThunderboltOutlined style={style} />), icon2: (<ThunderboltFilled style={style} />), path: '/pipeline/list' },
    { name: 'Virtual Machine', icon: (<HddOutlined style={style} />), icon2: (<HddFilled style={style} />), path: '/vm' },
    { name: 'Module', icon: (<GoldOutlined style={style} />), icon2: (<GoldFilled style={style} />), path: '/module' },
    { name: 'Cloud Server', icon: (<CloudServerOutlined style={style} />), icon2: (<CloudServerOutlined style={style} />), path: '/server' },
    { name: 'Deployment', icon: (<DeploymentUnitOutlined style={style} />), icon2: (<DeploymentUnitOutlined style={style} />), path: '/deploy' },
    { name: 'Monitor', icon: (<LineChartOutlined style={style} />), icon2: (<LineChartOutlined style={style} />), path: '/monitor' },
    { name: 'Log', icon: (<FilterOutlined style={style} />), icon2: (<FilterFilled style={style} />), path: '/log' }
]

const contents = [
    { path: '/index', component: DashboardIndex, title: 'Dashboard' },
    { path: '/pipeline/list', component: PipeLineList, title: 'Pipeline list' },
    { path: '/pipeline/detail', component: PipeLineDetail, title: 'Pipeline detail' },
    { path: '/vm', component: VM, title: 'Virtual Machine' },
    { path: '/module', component: Module, title: 'Module Information' },
    { path: '/server', component: Server, title: 'Cloud Server' },
    { path: '/deploy', component: Deploy, title: 'Deploying list' },
    { path: '/monitor', component: MonitorIndex, title: 'Monitor' },
    { path: '/log', component: LogIndex, title: 'Log Query' },
    { component: P404 }
]

function Main(props) {
    const context = contents.find(v => { return v.path === props.history.location.pathname })
    if (context) {
        document.title = context.title
    }

    const [collapsed, set_collapsed] = useState(false)
    const toggle = () => {
        set_collapsed(!collapsed)
    }
    const [username, set_username] = useState('')
    useEffect(() => {
        async function run() {
            const user = await info()
            set_username(user.username)
        }
        run()
    }, [])

    const do_logout = async function () {
        await logout()
    }

    const userMenu = (
        <Menu>
            <Menu.Item onClick={do_logout} icon={<LogoutOutlined />}>
                Logout
            </Menu.Item>
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
                <Header className="site-layout-background" style={{ padding: 0 }}>
                    <Row justify='space-between'>
                        <Col span={2}>
                            <span style={{ display: 'inline' }}>
                                {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                                    className: 'trigger',
                                    onClick: toggle,
                                })}
                            </span>
                        </Col>
                        <Col span={2}>
                            <Dropdown overlay={userMenu}>
                                <Avatar style={{ color: '#f56a00', backgroundColor: '#fde3cf' }}>{username}</Avatar>
                            </Dropdown>
                        </Col>
                    </Row>
                </Header>

                <Content
                    className="site-layout-background content-page-par"
                >
                    <TransitionGroup className='content-page'>
                        <CSSTransition
                            timeout={300}
                            classNames='page'
                            mountOnEnter
                            unmountOnExit
                            appear
                            key={props.location.pathname}>
                            <Switch location={props.location}>
                                {
                                    contents.map((v, index) => {
                                        return (
                                            <Route key={index} path={v.path} component={v.component}></Route>
                                        )
                                    })
                                }
                            </Switch>
                        </CSSTransition>
                    </TransitionGroup>
                </Content>
            </Layout>
        </Layout>
    );
}

export default withRouter(Main);