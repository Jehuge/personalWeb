import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Skeleton, Button, Timeline } from 'antd'
import {
  FileTextOutlined,
  PictureOutlined,
  RobotOutlined,
  EyeOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import api from '../utils/api'
import PageHeader from '../components/PageHeader'

interface Stats {
  blog_count: number
  photo_count: number
  ai_project_count: number
  total_views: number
}

const getTotalFromResponse = (response: any) => {
  const headerTotal = response?.headers?.['x-total-count']
  if (headerTotal) return Number(headerTotal)
  if (typeof response?.data?.total === 'number') return response.data.total
  if (Array.isArray(response?.data)) return response.data.length
  return 0
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const [blogs, photos, projects] = await Promise.all([
        api.get('/blogs', { params: { limit: 100 } }),
        api.get('/photos', { params: { limit: 100 } }),
        api.get('/ai-projects', { params: { limit: 100 } }),
      ])

      setStats({
        blog_count: getTotalFromResponse(blogs),
        photo_count: getTotalFromResponse(photos),
        ai_project_count: getTotalFromResponse(projects),
        total_views: (blogs.data || []).reduce((total: number, blog: any) => total + (blog.view_count || 0), 0),
      })
      setLastSyncedAt(new Date().toLocaleString())
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="仪表盘"
        description="快速洞察全站内容体量和重点动态，追踪博客、摄影与 AI 项目的运行状况。"
        stats={[
          { label: '博客', value: stats?.blog_count ?? '--' },
          { label: '摄影作品', value: stats?.photo_count ?? '--' },
          { label: 'AI 项目', value: stats?.ai_project_count ?? '--' },
        ]}
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchStats}>
            刷新数据
          </Button>
        }
      />

      <Card className="app-card" bodyStyle={{ padding: 24 }}>
        {loading && !stats ? (
          <Skeleton active />
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="博客文章"
                value={stats?.blog_count ?? '--'}
                prefix={<FileTextOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="摄影作品"
                value={stats?.photo_count ?? '--'}
                prefix={<PictureOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="AI 项目"
                value={stats?.ai_project_count ?? '--'}
                prefix={<RobotOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Statistic
                title="累计浏览量"
                value={stats?.total_views ?? 0}
                prefix={<EyeOutlined />}
              />
            </Col>
          </Row>
        )}
      </Card>

      <Card
        className="app-card"
        title="今日待办导航"
        extra={lastSyncedAt ? `最近同步：${lastSyncedAt}` : undefined}
      >
        <Timeline
          items={[
            {
              color: 'green',
              dot: <ThunderboltOutlined />,
              children: '更新热门博客内容，保持曝光热度',
            },
            {
              color: 'blue',
              dot: <PictureOutlined />,
              children: '精选摄影作品，完善封面描述',
            },
            {
              color: 'cyan',
              dot: <ApartmentOutlined />,
              children: '检查 AI 项目数据源是否最新',
            },
          ]}
        />
      </Card>
    </div>
  )
}




