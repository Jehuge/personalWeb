import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Spin } from 'antd'
import {
  FileTextOutlined,
  PictureOutlined,
  RobotOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import api from '../utils/api'

interface Stats {
  blog_count: number
  photo_count: number
  ai_project_count: number
  total_views: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // 这里可以创建一个统计API，暂时使用多个请求
      const [blogs, photos, projects] = await Promise.all([
        api.get('/blogs?limit=1'),
        api.get('/photos?limit=1'),
        api.get('/ai-projects?limit=1'),
      ])

      // 这里应该从API获取实际统计数据
      // 暂时使用模拟数据
      setStats({
        blog_count: 0, // 需要后端提供统计接口
        photo_count: 0,
        ai_project_count: 0,
        total_views: 0,
      })
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>仪表盘</h1>
      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="博客文章"
              value={stats?.blog_count || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="摄影作品"
              value={stats?.photo_count || 0}
              prefix={<PictureOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="AI项目"
              value={stats?.ai_project_count || 0}
              prefix={<RobotOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总浏览量"
              value={stats?.total_views || 0}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}




