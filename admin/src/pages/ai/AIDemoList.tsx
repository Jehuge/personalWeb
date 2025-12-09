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

interface AIDemo {
  id: number
  title: string
  slug: string
  category?: string
  tags?: string
  description?: string
  cover_image?: string
  bundle_path?: string
  entry_file?: string
  external_url?: string
  iframe_height?: number
  is_published: boolean
  is_featured: boolean
  sort_order: number
  view_count: number
  created_at: string
}

const buildLocalPreviewUrl = (demo: AIDemo) => {
  const base = (demo.bundle_path || demo.slug || '').replace(/^\/+/, '').replace(/^aiLab\//, '')
  const entry = demo.entry_file || 'index.html'
  return `/aiLab/${base || demo.slug}/${entry}`
}

export default function AIDemoList() {
  const navigate = useNavigate()
  const [demos, setDemos] = useState<AIDemo[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchDemos()
  }, [])

  const fetchDemos = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/ai-demos', { params: { limit: 200 } })
      setDemos(data)
    } catch (error) {
      message.error('获取 Demo 列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/ai-demos/${id}`)
      message.success('删除成功')
      fetchDemos()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const publishedCount = useMemo(
    () => demos.filter((item) => item.is_published).length,
    [demos],
  )
  const featuredCount = useMemo(
    () => demos.filter((item) => item.is_featured).length,
    [demos],
  )

  const columns: ColumnsType<AIDemo> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 70,
    },
    {
      title: '封面',
      dataIndex: 'cover_image',
      width: 110,
      render: (url) =>
        url ? <Image src={url} alt="cover" width={70} height={70} style={{ objectFit: 'cover' }} /> : '-',
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
      width: 200,
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
      title: '来源目录',
      dataIndex: 'bundle_path',
      width: 200,
      ellipsis: true,
      render: (_, record) => record.bundle_path || record.slug,
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
      title: '排序',
      dataIndex: 'sort_order',
      width: 90,
    },
    {
      title: '浏览',
      dataIndex: 'view_count',
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
      width: 220,
      fixed: 'right',
      className: 'table-col-actions',
      render: (_, record) => {
        const previewUrl = record.external_url || buildLocalPreviewUrl(record)
        return (
          <div className="table-actions">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => window.open(previewUrl, '_blank')}
            >
              预览
            </Button>
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => navigate(`/ai-demos/${record.id}`)}
            >
              编辑
            </Button>
            <Popconfirm title="确定删除这个 Demo 吗？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" danger>
                删除
              </Button>
            </Popconfirm>
          </div>
        )
      },
    },
  ]

  return (
    <div className="page-shell">
      <PageHeader
        title="AI Lab Demo"
        description="管理 Gemini 生成或自研的小实验，统一控制展示与素材。"
        stats={[
          { label: 'Demo 总数', value: demos.length },
          { label: '已发布', value: publishedCount },
          { label: '精选', value: featuredCount },
        ]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchDemos}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/ai-demos/new')}>
              新建 Demo
            </Button>
          </Space>
        }
      />
      <Card className="app-card">
        <Table
          className="app-table"
          rowKey="id"
          columns={columns}
          dataSource={demos}
          loading={loading}
          scroll={{ x: 1400 }}
        />
      </Card>
    </div>
  )
}







