import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Tag,
  Image,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../../utils/api'
import dayjs from 'dayjs'

interface AIProject {
  id: number
  title: string
  slug: string
  description?: string
  cover_image?: string
  is_featured: boolean
  is_published: boolean
  view_count: number
  created_at: string
}

export default function AIProjectList() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<AIProject[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await api.get('/ai-projects', { params: { limit: 100 } })
      setProjects(response.data)
    } catch (error) {
      message.error('获取AI项目列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/ai-projects/${id}`)
      message.success('删除成功')
      fetchProjects()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const columns: ColumnsType<AIProject> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '封面',
      dataIndex: 'cover_image',
      width: 100,
      render: (url) => (
        url ? (
          <Image
            src={url}
            alt="封面"
            width={60}
            height={60}
            style={{ objectFit: 'cover' }}
          />
        ) : '-'
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'is_published',
      width: 100,
      render: (published) => (
        <Tag color={published ? 'green' : 'default'}>
          {published ? '已发布' : '草稿'}
        </Tag>
      ),
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
            onClick={() => navigate(`/ai-projects/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个项目吗？"
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/ai-projects/new')}
        >
          新建项目
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={projects}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
      />
    </div>
  )
}




