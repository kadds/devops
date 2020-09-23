import React, { useState, useEffect } from 'react'
import { BrowserRouter, Route, Link, Switch, NavLink } from 'react-router-dom'
import { Layout, Menu, Avatar, Row, Col, Dropdown } from 'antd'
import { info, logout } from './api/user'
import {
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    UserOutlined,
    LogoutOutlined,
    VideoCameraOutlined,
    CloudServerOutlined,
    BuildOutlined,
    HddOutlined,
    GoldOutlined,
    GatewayOutlined,
    UnorderedListOutlined,
    ProjectOutlined,
} from '@ant-design/icons'
import PipeLineList from './view/pipeline/list'
import PipeLineDetail from './view/pipeline/detail'
import VM from './view/vm/vm'
import Module from './view/module/module'
import Server from './view/server/server'
import P404 from './view/P404'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { withRouter } from 'react-router-dom'



const { Header, Sider, Content } = Layout;
const menus = [
    { name: 'Pipeline List', icon: (<UnorderedListOutlined />), path: '/pipeline/list' },
    { name: 'VM', icon: (<GoldOutlined />), path: '/vm' },
    { name: 'Module', icon: (<HddOutlined />), path: '/module' },
    { name: 'Server', icon: (<BuildOutlined />), path: '/server' },
    { name: 'Monitor', icon: (<ProjectOutlined />), path: '/monitor' },
    { name: 'Log', icon: (<GatewayOutlined />), path: '/log' }
]



function Main(props) {
    const contents = [
        { path: '/pipeline/list', component: PipeLineList },
        { path: '/pipeline/detail', component: PipeLineDetail },
        { path: '/vm', component: VM },
        { path: '/module', component: Module },
        { path: '/server', component: Server },
        { path: '/monitor', component: P404 },
        { path: '/log', component: P404 },
        { component: P404 }
    ]
    // useEffect(() => {
    //     props.history.listen((val) => {

    //     })
    // }, [])
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
        return (
            <Menu selectedKeys={[props.location.pathname]} style={{ height: '100%', overflowY: 'auto' }} theme="dark" mode="inline">
                {
                    menus.map(item => {
                        if (item.sub === undefined) {
                            return (
                                <Menu.Item key={item.path} icon={item.icon}>
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
            <Layout className="site-layout" style={{ overflowX: 'visible' }}>
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