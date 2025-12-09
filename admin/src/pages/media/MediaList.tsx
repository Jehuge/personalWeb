import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Image,
  Tag,
  Modal,
} from 'antd'
import {
  DeleteOutlined,
  EyeOutlined,
  PictureOutlined,
  FileImageOutlined,
  RobotOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../../utils/api'
import dayjs from 'dayjs'
import PageHeader from '../../components/PageHeader'

interface MediaItem {
  id: string
  type: 'blog_cover' | 'photo' | 'ai_cover'
  title: string
  url: string
  thumbnail_url?: string
  file_size?: number
  width?: number
  height?: number
  related_id: number
  related_type: string
  created_at?: string
}

export default function MediaList() {
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [mediaType, setMediaType] = useState<string | undefined>()
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState<string>('')

  useEffect(() => {
    fetchStats()
    fetchMediaList()
  }, [mediaType])

  const fetchStats = async () => {
    try {
      const response = await api.get('/media/stats')
      setStats(response.data)
    } catch (error) {
      console.error('获取统计信息失败:', error)
    }
  }

  const fetchMediaList = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (mediaType) params.media_type = mediaType
      
      const response = await api.get('/media', { params })
      setMediaList(response.data.items || [])
    } catch (error) {
      message.error('获取媒体列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/media/${id}`)
      message.success('删除成功')
      fetchMediaList()
      fetchStats()
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败')
    }
  }

  const handlePreview = (url: string) => {
    setPreviewImage(url)
    setPreviewVisible(true)
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, { text: string; color: string; icon: React.ReactNode }> = {
      blog_cover: { text: '博客封面', color: 'blue', icon: <FileImageOutlined /> },
      photo: { text: '摄影作品', color: 'green', icon: <PictureOutlined /> },
      ai_cover: { text: 'AI项目封面', color: 'cyan', icon: <RobotOutlined /> },
    }
    return labels[type] || { text: type, color: 'default', icon: null }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const refreshAll = () => {
    fetchStats()
    fetchMediaList()
  }

  const columns: ColumnsType<MediaItem> = [
    {
      title: '缩略图',
      dataIndex: 'thumbnail_url',
      width: 100,
      render: (url, record) => (
        <Image
          src={url || record.url}
          alt={record.title}
          width={60}
          height={60}
          style={{ objectFit: 'cover', cursor: 'pointer' }}
          preview={false}
          onClick={() => handlePreview(record.url)}
        />
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 120,
      render: (type) => {
        const { text, color, icon } = getTypeLabel(type)
        return (
          <Tag color={color} icon={icon}>
            {text}
          </Tag>
        )
      },
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      width: 200,
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      width: 100,
      render: (size) => formatFileSize(size),
    },
    {
      title: '尺寸',
      width: 120,
      render: (_, record) => {
        if (record.width && record.height) {
          return `${record.width} × ${record.height}`
        }
        return '-'
      },
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      width: 180,
      render: (date) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: '操作',
      width: 170,
      fixed: 'right',
      className: 'table-col-actions',
      render: (_, record) => (
        <div className="table-actions">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record.url)}
          >
            查看
          </Button>
          <Popconfirm
            title="确定要删除这个资源吗？"
            description="删除后将从OSS和数据库中移除"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ]

  return (
    <div className="page-shell">
      <PageHeader
        title="媒体资源"
        description="统一管理 OSS 资源，支持类型筛选与快速预览，确保封面/插图素材可控可查。"
        stats={[
          { label: '资源总量', value: stats?.total ?? '--' },
          { label: '博客封面', value: stats?.blog_covers ?? '--' },
          { label: '摄影作品', value: stats?.photos ?? '--' },
          { label: 'AI 封面', value: stats?.ai_covers ?? '--' },
        ]}
        extra={
          <Button icon={<ReloadOutlined />} onClick={refreshAll}>
            重新同步
          </Button>
        }
      />

      <Card className="app-card">
        <Row gutter={16}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="博客封面"
              value={stats?.blog_covers || 0}
              prefix={<FileImageOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="摄影作品"
              value={stats?.photos || 0}
              prefix={<PictureOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title="个人项目封面"
              value={stats?.ai_covers || 0}
              prefix={<RobotOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title="总计" value={stats?.total || 0} />
          </Col>
        </Row>
      </Card>

      <Card className="app-card">
        <div className="page-toolbar">
          <div className="page-toolbar__filters">
            <Select
              placeholder="筛选类型"
              style={{ width: 200 }}
              allowClear
              value={mediaType}
              onChange={setMediaType}
            >
              <Select.Option value="blog_cover">博客封面</Select.Option>
              <Select.Option value="photo">摄影作品</Select.Option>
              <Select.Option value="ai_cover">个人项目封面</Select.Option>
            </Select>
          </div>
          <div className="page-toolbar__actions">
            <Button onClick={() => setMediaType(undefined)}>查看全部</Button>
          </div>
        </div>
        <Table
          className="app-table"
          columns={columns}
          dataSource={mediaList}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        open={previewVisible}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        <img
          alt="预览"
          style={{ width: '100%' }}
          src={previewImage}
        />
      </Modal>
    </div>
  )
}




