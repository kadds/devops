import React, { useState, useEffect } from 'react';
import { BrowserRouter, Route, Link, Switch, NavLink } from 'react-router-dom'
import { Layout, Menu, Avatar, Row, Col, Dropdown } from 'antd'
import { info, logout } from './api/user'
import {
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    UserOutlined,
    LogoutOutlined,
    VideoCameraOutlined,
    UploadOutlined,
    BuildOutlined,
    HddOutlined,
    GoldOutlined,
    GatewayOutlined,
    UnorderedListOutlined,
    ProjectOutlined,
} from '@ant-design/icons';
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
            console.log(user)
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
        <Layout>
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <div className="logo" />
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
                        VM
                    </Menu.Item>
                    <Menu.Item key="3" icon={<HddOutlined />}>
                        Module
                    </Menu.Item>
                    <Menu.Item key="4" icon={<UserOutlined />}>
                        User List
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
                </Content>
            </Layout>
        </Layout>
    );
}

export default Main;