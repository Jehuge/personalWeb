import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Tag,
  Image,
  Card,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import api from '../../utils/api'
import PageHeader from '../components/PageHeader'

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
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  useEffect(() => {
    fetchProjects(1, pageSize)
  }, [])

  const fetchProjects = async (page = 1, size = pageSize) => {
    setLoading(true)
    try {
      const skip = (page - 1) * size
      const response = await api.get('/ai-projects', { params: { skip, limit: size } })
      setProjects(response.data)
      const headerCount = response.headers?.['x-total-count'] || response.headers?.['X-Total-Count']
      setTotalCount(headerCount ? Number(headerCount) : response.data.length)
      setCurrentPage(page)
      setPageSize(size)
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

  const publishedCount = useMemo(
    () => projects.filter((project) => project.is_published).length,
    [projects],
  )
  const featuredCount = useMemo(
    () => projects.filter((project) => project.is_featured).length,
    [projects],
  )

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
      width: 200,
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
      width: 170,
      fixed: 'right',
      className: 'table-col-actions',
      render: (_, record) => (
        <div className="table-actions">
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
        </div>
      ),
    },
  ]

  return (
    <div className="page-shell">
      <PageHeader
        title="个人项目"
        description="管理 AI 相关项目，快速查看发布状态与浏览表现。"
        stats={[
          { label: '项目总数', value: totalCount ?? projects.length },
          { label: '已发布', value: publishedCount },
          { label: '精选', value: featuredCount },
        ]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => fetchProjects(1, pageSize)}>
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/ai-projects/new')}
            >
              新建项目
            </Button>
          </Space>
        }
      />
      <Card className="app-card">
        <Table
          className="app-table"
          columns={columns}
          dataSource={projects}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: currentPage,
            pageSize,
            total: totalCount ?? projects.length,
            showSizeChanger: true,
            onChange: (page, size) => {
              fetchProjects(page, size)
            },
          }}
        />
      </Card>
    </div>
  )
}




