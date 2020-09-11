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
import Server from './view/server/server'

const { Header, Sider, Content } = Layout;
const menus = [{
    name: 'Pipeline', icon: (<GatewayOutlined />), sub: [
        { name: 'Pipeline List', icon: (<UnorderedListOutlined />), path: '/pipeline/list' },
        { name: 'Create Pipeline', icon: (<ProjectOutlined />), path: '/pipeline/create' },
        { name: 'Pipeline Progress', icon: (<BuildOutlined />), path: '/pipeline/detail' },
    ],
},
{ name: 'VM', icon: (<GoldOutlined />), path: '/vm' },
{ name: 'Module', icon: (<HddOutlined />), path: '/module' },
{ name: 'Server', icon: (<HddOutlined />), path: '/server' }
]


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
                <Menu theme="dark" mode="inline">
                    {
                        menus.map(item => {
                            if (item.sub === undefined) {
                                return (
                                    <Menu.Item key={item.name} icon={item.icon}>
                                        <NavLink activeClassName="active" className="nav-link" to={item.path}>
                                            {item.name}
                                        </NavLink>
                                    </Menu.Item>
                                )
                            }
                            else {
                                return (
                                    <Menu.SubMenu key={item.name} icon={item.icon} title={item.name}>
                                        <Menu.ItemGroup>
                                            {
                                                item.sub.map(item => (
                                                    <Menu.Item key={item.name} icon={item.icon}>
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
                        <Route path='/server' component={Server}></Route>
                        <Route component={PipeLineList}></Route>
                    </Switch>
                </Content>
            </Layout>
        </Layout>
    );
}

export default Main;