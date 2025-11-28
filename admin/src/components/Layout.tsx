import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  Layout as AntLayout,
  Menu,
  Avatar,
  Dropdown,
  Space,
  Typography,
} from 'antd'
import {
  DashboardOutlined,
  FileTextOutlined,
  PictureOutlined,
  RobotOutlined,
  LogoutOutlined,
  UserOutlined,
  TagsOutlined,
  FolderOutlined,
  TeamOutlined,
  CloudOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

const { Header, Sider, Content } = AntLayout
const { Text } = Typography

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/blogs',
    icon: <FileTextOutlined />,
    label: '博客管理',
  },
  {
    key: '/blog-categories',
    icon: <FolderOutlined />,
    label: '博客分类',
  },
  {
    key: '/tags',
    icon: <TagsOutlined />,
    label: '标签管理',
  },
  {
    key: '/photos',
    icon: <PictureOutlined />,
    label: '摄影作品',
  },
  {
    key: '/photo-categories',
    icon: <FolderOutlined />,
    label: '摄影分类',
  },
  {
    key: '/ai-projects',
    icon: <RobotOutlined />,
    label: 'AI项目',
  },
  {
    key: '/users',
    icon: <TeamOutlined />,
    label: '用户管理',
  },
  {
    key: '/media',
    icon: <CloudOutlined />,
    label: '媒体资源',
  },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'user',
      label: (
        <Space>
          <UserOutlined />
          <span>{user?.username}</span>
        </Space>
      ),
      disabled: true,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: (
        <Space>
          <LogoutOutlined />
          <span>退出登录</span>
        </Space>
      ),
      onClick: handleLogout,
    },
  ]

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 18,
            fontWeight: 'bold',
          }}
        >
          {collapsed ? 'PW' : '个人网站管理'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <AntLayout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text strong style={{ fontSize: 18 }}>
            管理后台
          </Text>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <Text>{user?.username}</Text>
            </Space>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#fff',
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>
    </AntLayout>
  )
}

