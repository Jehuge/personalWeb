import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Select,
  Image,
  Tag,
  Card,
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import api from '../../utils/api'
import PageHeader from '../../components/PageHeader'

interface Photo {
  id: number
  title: string
  image_url: string
  thumbnail_url?: string
  is_featured: boolean
  view_count: number
  created_at: string
  category?: { name: string }
}

export default function PhotoList() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>()

  useEffect(() => {
    fetchPhotos()
    fetchCategories()
  }, [categoryFilter])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/photos/categories')
      setCategories(response.data)
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }

  const fetchPhotos = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (categoryFilter) params.category_id = categoryFilter
      
      const response = await api.get('/photos', { params })
      setPhotos(response.data)
    } catch (error) {
      message.error('获取摄影作品列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/photos/${id}`)
      message.success('删除成功')
      fetchPhotos()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const featuredCount = useMemo(() => photos.filter((photo) => photo.is_featured).length, [photos])
  const totalViews = useMemo(
    () => photos.reduce((total, photo) => total + (photo.view_count || 0), 0),
    [photos],
  )

  const columns: ColumnsType<Photo> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '缩略图',
      dataIndex: 'thumbnail_url',
      width: 100,
      render: (url, record) => (
        <Image
          src={url || record.image_url}
          alt={record.title}
          width={60}
          height={60}
          style={{ objectFit: 'cover' }}
        />
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      width: 120,
      render: (name) => name || '-',
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
            onClick={() => navigate(`/photos/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这张照片吗？"
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
        title="摄影作品"
        description="集中管理已发布及待发布的摄影素材，支持分类筛选与精选标记。"
        stats={[
          { label: '作品总数', value: photos.length },
          { label: '精选', value: featuredCount },
          { label: '累计浏览', value: totalViews },
        ]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchPhotos}>
              刷新
            </Button>
            <Button icon={<UploadOutlined />} onClick={() => navigate('/photos/bulk')}>
              批量上传
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/photos/new')}
            >
              上传照片
            </Button>
          </Space>
        }
      />
      <Card className="app-card">
        <div className="page-toolbar">
          <div className="page-toolbar__filters">
            <Select
              placeholder="按分类筛选"
              style={{ width: 220 }}
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
          </div>
          <div className="page-toolbar__actions">
            <Button onClick={() => setCategoryFilter(undefined)}>全部分类</Button>
          </div>
        </div>
        <Table
          className="app-table"
          columns={columns}
          dataSource={photos}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  )
}




