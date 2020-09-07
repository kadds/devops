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
import PipeLineCreate from './view/pipeline/create'
import VM from './view/vm/vm'
import Module from './view/module/module'

const { Header, Sider, Content } = Layout;

function Main(props) {
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

    return (
        <Layout style={{ height: '100%' }}>
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']}>
                    <Menu.SubMenu key="1" title={"Pipeline"} icon={<GatewayOutlined />}>
                        <Menu.ItemGroup>
                            <Menu.Item key="11" icon={<UnorderedListOutlined />}>
                                <NavLink activeClassName="active" className="nav-link" to="/pipeline/list">
                                    Pipeline List
                                </NavLink>
                            </Menu.Item>
                            <Menu.Item key="12" icon={<ProjectOutlined />}>
                                <NavLink activeClassName="active" className="nav-link" to="/pipeline/create">
                                    Create Pipeline
                                </NavLink>
                            </Menu.Item>
                            <Menu.Item key="13" icon={<BuildOutlined />}>
                                <NavLink activeClassName="active" className="nav-link" to="/pipeline/detail">
                                    Pipeline Progress
                                </NavLink>
                            </Menu.Item>
                        </Menu.ItemGroup>
                    </Menu.SubMenu>
                    <Menu.Item key="2" icon={<GoldOutlined />}>
                        <NavLink activeClassName="active" className="nav-link" to="/vm">
                            VM
                        </NavLink>
                    </Menu.Item>
                    <Menu.Item key="3" icon={<HddOutlined />}>
                        <NavLink activeClassName="active" className="nav-link" to="/module">
                            Module
                        </NavLink>
                    </Menu.Item>
                </Menu>
            </Sider>
            <Layout className="site-layout">
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
                    className="site-layout-background"
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 280,
                    }}
                >
                    <Switch>
                        <Route path='/pipeline/list' component={PipeLineList}></Route>
                        <Route path='/pipeline/create' component={PipeLineCreate}></Route>Q
                        <Route path='/pipeline/detail' component={PipeLineDetail}></Route>

                        <Route path='/vm' component={VM}></Route>
                        <Route path='/module' component={Module}></Route>
                        <Route component={PipeLineList}></Route>
                    </Switch>
                </Content>
            </Layout>
        </Layout>
    );
}

export default Main;