import { useEffect, useState } from 'react'
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
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../../utils/api'
import dayjs from 'dayjs'

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
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space>
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
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Select
          placeholder="选择分类"
          style={{ width: 200 }}
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
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/photos/new')}
        >
          上传照片
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={photos}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
      />
    </div>
  )
}




