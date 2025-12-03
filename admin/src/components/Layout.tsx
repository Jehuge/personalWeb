import { useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout as AntLayout, Menu, Avatar, Typography, Button, Tabs } from 'antd'
import {
  CloudOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FolderOutlined,
  LogoutOutlined,
  PictureOutlined,
  RobotOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

const { Sider, Content } = AntLayout
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
    key: '/ai-demos',
    icon: <ExperimentOutlined />,
    label: 'AI Lab Demo',
  },
  {
    key: '/ai-images',
    icon: <PictureOutlined />,
    label: 'AI 图片',
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

const routeTitles: Record<string, string> = {
  '/': '仪表盘',
  '/blogs': '博客管理',
  '/blogs/new': '新建博客',
  '/blog-categories': '博客分类',
  '/tags': '标签管理',
  '/photos': '摄影作品',
  '/photos/new': '上传照片',
  '/photo-categories': '摄影分类',
  '/ai-projects': 'AI项目',
  '/ai-projects/new': '新建AI项目',
  '/ai-demos': 'AI Lab Demo',
  '/ai-demos/new': '新建AI Demo',
  '/ai-images': 'AI 图片管理',
  '/ai-images/new': '新建 AI 图片',
  '/users': '用户管理',
  '/media': '媒体资源',
}

const dynamicRouteMatchers: Array<{ pattern: RegExp; title: string }> = [
  { pattern: /^\/blogs\/\d+$/, title: '编辑博客' },
  { pattern: /^\/photos\/\d+$/, title: '编辑照片' },
  { pattern: /^\/ai-projects\/\d+$/, title: '编辑AI项目' },
  { pattern: /^\/ai-demos\/\d+$/, title: '编辑AI Demo' },
  { pattern: /^\/ai-images\/\d+$/, title: '编辑 AI 图片' },
]

const baseTab = { key: '/', label: '仪表盘', closable: false }

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [collapsed, setCollapsed] = useState(false)
  const [tabs, setTabs] = useState<Array<{ key: string; label: string; closable: boolean }>>([baseTab])
  const [activeKey, setActiveKey] = useState('/')

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const currentTitle = useMemo(() => {
    const path = location.pathname
    if (routeTitles[path]) return routeTitles[path]
    const dynamicMatch = dynamicRouteMatchers.find(({ pattern }) => pattern.test(path))
    if (dynamicMatch) return dynamicMatch.title
    return '页面'
  }, [location.pathname])

  useEffect(() => {
    const path = location.pathname
    setActiveKey(path)
    setTabs((prev) => {
      if (prev.some((tab) => tab.key === path)) return prev
      return [
        ...prev,
        {
          key: path,
          label: currentTitle,
          closable: path !== '/',
        },
      ]
    })
  }, [location.pathname, currentTitle])

  const handleTabChange = (key: string) => {
    setActiveKey(key)
    if (key !== location.pathname) {
      navigate(key)
    }
  }

  const handleTabEdit = (targetKey: string, action: 'add' | 'remove') => {
    if (action === 'remove') {
      setTabs((prev) => {
        const filtered = prev.filter((tab) => tab.key !== targetKey)
        if (filtered.length === 0) {
          navigate('/')
          return [baseTab]
        }
        if (targetKey === activeKey) {
          const fallback = filtered[filtered.length - 1]
          navigate(fallback.key)
        }
        return filtered
      })
    }
  }

  return (
    <AntLayout className="app-shell">
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        style={{
          background:
            'linear-gradient(180deg, #111827 0%, #1f2937 60%, #0f172a 100%)',
        }}
      >
        <div className="sider-inner">
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
          <div className={`sider-footer ${collapsed ? 'sider-footer--collapsed' : ''}`}>
            {!collapsed ? (
              <div className="sider-user-card">
                <Avatar size={48} icon={<UserOutlined />} />
                <Text className="sider-user-name">{user?.username}</Text>
                <Text className="sider-user-welcome">欢迎回来</Text>
                <Button
                  icon={<LogoutOutlined />}
                  danger
                  block
                  style={{ marginTop: 12 }}
                  onClick={handleLogout}
                >
                  退出登录
                </Button>
              </div>
            ) : (
              <Button
                danger
                type="text"
                icon={<LogoutOutlined />}
                onClick={handleLogout}
                className="sider-logout-icon"
              />
            )}
          </div>
        </div>
      </Sider>
      <AntLayout className="app-layout__content">
        <Content className="app-content">
          <Tabs
            type="editable-card"
            hideAdd
            activeKey={activeKey}
            onChange={handleTabChange}
            onEdit={(targetKey, action) => handleTabEdit(targetKey as string, action as 'add' | 'remove')}
            items={tabs.map((tab) => ({ ...tab }))}
            style={{ marginBottom: 16 }}
          />
          <div className="app-content__inner">
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
