import React, { useState } from 'react';
import { BrowserRouter, Route, Link, Switch } from 'react-router-dom'
import { Layout, Menu } from 'antd';
import {
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    UserOutlined,
    VideoCameraOutlined,
    UploadOutlined,
} from '@ant-design/icons';
const { Header, Sider, Content } = Layout;

function Main(props) {
    const [collapsed, set_collapsed] = useState(false)
    const toggle = () => {
        set_collapsed(!collapsed)
    }
    return (
        <Layout>
            <Sider trigger={null} collapsible collapsed={collapsed}>
                <div className="logo" />
                <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']}>
                    <Menu.SubMenu key="1" title={"Pipeline"}>
                        <Menu.ItemGroup>
                            <Menu.Item key="11" icon={<UserOutlined />}>
                                Pipeline List
                            </Menu.Item>
                            <Menu.Item key="12" icon={<UserOutlined />}>
                                Create Pipeline
                            </Menu.Item>
                            <Menu.Item key="13" icon={<UserOutlined />}>
                                Pipeline Progress
                            </Menu.Item>
                        </Menu.ItemGroup>
                    </Menu.SubMenu>
                    <Menu.Item key="2" icon={<UploadOutlined />}>
                        VM
                    </Menu.Item>
                    <Menu.Item key="3" icon={<UploadOutlined />}>
                        Module
                    </Menu.Item>
                    <Menu.Item key="4" icon={<UserOutlined />}>
                        User List
                    </Menu.Item>
                </Menu>
            </Sider>
            <Layout className="site-layout">
                <Header className="site-layout-background" style={{ padding: 0 }}>
                    {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                        className: 'trigger',
                        onClick: toggle,
                    })}
                </Header>

                <Content
                    className="site-layout-background"
                    style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 280,
                    }}
                >
                    <Route path='/user' ></Route>
                </Content>
            </Layout>
        </Layout>
    );
}

export default Main;