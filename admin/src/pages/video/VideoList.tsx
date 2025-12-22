import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Select,
  Tag,
  Card,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import api from '../../utils/api'
import PageHeader from '../components/PageHeader'

interface Video {
  id: number
  title: string
  video_url: string
  thumbnail_video_url?: string
  duration?: number
  width?: number
  height?: number
  file_size?: number
  is_featured: boolean
  is_published: boolean
  view_count: number
  created_at: string
  category?: { name: string }
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return '——'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (size?: number) => {
  if (!size || size <= 0) return '——'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function VideoList() {
  const navigate = useNavigate()
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>()
  const [publishedFilter, setPublishedFilter] = useState<boolean | undefined>()
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  useEffect(() => {
    fetchVideos(1, pageSize)
    fetchCategories()
  }, [categoryFilter, publishedFilter])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/videos/categories')
      setCategories(response.data)
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }

  const fetchVideos = async (page = 1, size = pageSize) => {
    setLoading(true)
    try {
      const skip = (page - 1) * size
      const params: any = { skip, limit: size }
      if (categoryFilter) params.category_id = categoryFilter
      if (publishedFilter !== undefined) params.is_published = publishedFilter
      // 管理后台需要看到未发布的视频，默认请求包含未发布项
      params.include_unpublished = true

      const response = await api.get('/videos', { params })
      setVideos(response.data)
      const headerCount = response.headers?.['x-total-count'] || response.headers?.['X-Total-Count']
      setTotalCount(headerCount ? Number(headerCount) : response.data.length)
      setCurrentPage(page)
      setPageSize(size)
    } catch (error) {
      message.error('获取视频列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/videos/${id}`)
      message.success('删除成功')
      fetchVideos()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const featuredCount = useMemo(() => videos.filter((video) => video.is_featured).length, [videos])
  const publishedCount = useMemo(() => videos.filter((video) => video.is_published).length, [videos])
  const totalViews = useMemo(
    () => videos.reduce((total, video) => total + (video.view_count || 0), 0),
    [videos],
  )

  const columns: ColumnsType<Video> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      width: 200,
    },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      width: 120,
      render: (name) => name || '-',
    },
    {
      title: '时长',
      dataIndex: 'duration',
      width: 100,
      render: (duration) => formatDuration(duration),
    },
    {
      title: '分辨率',
      dataIndex: 'width',
      width: 120,
      render: (width, record) => {
        if (width && record.height) {
          return `${width}×${record.height}`
        }
        return '——'
      },
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      width: 120,
      render: (size) => formatFileSize(size),
    },
    {
      title: '精选',
      dataIndex: 'is_featured',
      width: 80,
      render: (featured) => (
        <Tag color={featured ? 'gold' : 'default'}>
          {featured ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '发布',
      dataIndex: 'is_published',
      width: 80,
      render: (published) => (
        <Tag color={published ? 'green' : 'default'}>
          {published ? '已发布' : '未发布'}
        </Tag>
      ),
    },
    {
      title: '浏览量',
      dataIndex: 'view_count',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
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
            icon={<EditOutlined />}
            onClick={() => navigate(`/videos/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个视频吗？"
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
        title="视频管理"
        description="集中管理已发布及待发布的视频素材，支持分类筛选与精选标记。"
        stats={[
          { label: '视频总数', value: totalCount ?? videos.length },
          { label: '精选', value: featuredCount },
          { label: '已发布', value: publishedCount },
          { label: '累计浏览', value: totalViews },
        ]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchVideos(1, pageSize)}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/videos/new')}
            >
              上传视频
            </Button>
          </Space>
        }
      />
      <Card className="app-card">
        <div className="page-toolbar">
          <div className="page-toolbar__filters">
            <Select
              placeholder="按分类筛选"
              style={{ width: 220, marginRight: 12 }}
              allowClear
              value={categoryFilter}
              onChange={setCategoryFilter}
            >
              {categories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
            <Select
              placeholder="按发布状态筛选"
              style={{ width: 150 }}
              allowClear
              value={publishedFilter}
              onChange={setPublishedFilter}
            >
              <Select.Option value={true}>已发布</Select.Option>
              <Select.Option value={false}>未发布</Select.Option>
            </Select>
          </div>
          <div className="page-toolbar__actions">
            <Button onClick={() => {
              setCategoryFilter(undefined)
              setPublishedFilter(undefined)
            }}>清除筛选</Button>
          </div>
        </div>
        <Table
          className="app-table"
          columns={columns}
          dataSource={videos}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize,
            total: totalCount ?? videos.length,
            showSizeChanger: true,
            onChange: (page, size) => {
              fetchVideos(page, size)
            },
          }}
        />
      </Card>
    </div>
  )
}

