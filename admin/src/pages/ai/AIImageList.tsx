import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Image,
  message,
  Popconfirm,
  Space,
  Table,
  Tag,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EditOutlined, EyeOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import api from '../../utils/api'
import PageHeader from '../../components/PageHeader'

interface AIImage {
  id: number
  title?: string
  image_url: string
  prompt?: string
  negative_prompt?: string
  model_name?: string
  parameters?: any
  category?: string
  tags?: string
  is_featured: boolean
  is_published: boolean
  view_count: number
  like_count: number
  created_at: string
}

export default function AIImageList() {
  const navigate = useNavigate()
  const [images, setImages] = useState<AIImage[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchImages()
  }, [])

  const fetchImages = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ai-images', { params: { limit: 200 } })
      setImages(data)
    } catch (error) {
      message.error('获取图片列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/ai-images/${id}`)
      message.success('删除成功')
      fetchImages()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const publishedCount = useMemo(
    () => images.filter((item) => item.is_published).length,
    [images],
  )
  const featuredCount = useMemo(
    () => images.filter((item) => item.is_featured).length,
    [images],
  )

  const columns: ColumnsType<AIImage> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 70,
    },
    {
      title: '图片',
      dataIndex: 'image_url',
      width: 110,
      render: (url) =>
        url ? <Image src={url} alt="cover" width={70} height={70} style={{ objectFit: 'cover' }} /> : '-',
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      render: (text) => text || '-',
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      render: (value) => value || '-',
    },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 180,
      render: (value) =>
        value ? (
          value
            .split(/[,，]/)
            .map((tag: string) => tag.trim())
            .filter(Boolean)
            .map((tag: string) => (
              <Tag key={tag} color="blue">
                {tag}
              </Tag>
            ))
        ) : (
          '-'
        ),
    },
    {
      title: '模型',
      dataIndex: 'model_name',
      width: 150,
      ellipsis: true,
      render: (value) => value || '-',
    },
    {
      title: '状态',
      dataIndex: 'is_published',
      width: 100,
      render: (published) => (
        <Tag color={published ? 'green' : 'default'}>{published ? '已发布' : '草稿'}</Tag>
      ),
    },
    {
      title: '精选',
      dataIndex: 'is_featured',
      width: 100,
      render: (featured) => (
        <Tag color={featured ? 'gold' : 'default'}>{featured ? '是' : '否'}</Tag>
      ),
    },
    {
      title: '浏览',
      dataIndex: 'view_count',
      width: 90,
    },
    {
      title: '点赞',
      dataIndex: 'like_count',
      width: 90,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 180,
      fixed: 'right',
      className: 'table-col-actions',
      render: (_, record) => (
        <div className="table-actions">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => navigate(`/ai-images/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm title="确定删除这张图片吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger>
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
        title="AI 图片管理"
        description="管理 AI 生成的图片，展示生成参数与效果。"
        stats={[
          { label: '图片总数', value: images.length },
          { label: '已发布', value: publishedCount },
          { label: '精选', value: featuredCount },
        ]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchImages}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/ai-images/new')}>
              新建图片
            </Button>
          </Space>
        }
      />
      <Card className="app-card">
        <Table
          className="app-table"
          rowKey="id"
          columns={columns}
          dataSource={images}
          loading={loading}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  )
}
