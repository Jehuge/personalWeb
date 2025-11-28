import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Input,
  Select,
  Tag,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../../utils/api'
import dayjs from 'dayjs'

interface Blog {
  id: number
  title: string
  slug: string
  is_published: boolean
  view_count: number
  created_at: string
  category?: { name: string }
  tags: Array<{ name: string }>
}

export default function BlogList() {
  const navigate = useNavigate()
  const [blogs, setBlogs] = useState<Blog[]>([])
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>()

  useEffect(() => {
    fetchBlogs()
    fetchCategories()
  }, [categoryFilter, searchText])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/blogs/categories')
      setCategories(response.data)
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }

  const fetchBlogs = async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (categoryFilter) params.category_id = categoryFilter
      if (searchText) params.search = searchText
      
      const response = await api.get('/blogs', { params })
      setBlogs(response.data)
    } catch (error) {
      message.error('获取博客列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/blogs/${id}`)
      message.success('删除成功')
      fetchBlogs()
    } catch (error) {
      message.error('删除失败')
    }
  }

  const columns: ColumnsType<Blog> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
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
      title: '标签',
      dataIndex: 'tags',
      width: 200,
      render: (tags) => (
        <Space size={[0, 8]} wrap>
          {tags?.map((tag: any) => (
            <Tag key={tag.id}>{tag.name}</Tag>
          ))}
        </Space>
      ),
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
            onClick={() => navigate(`/blogs/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这篇博客吗？"
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
        <Space>
          <Input
            placeholder="搜索标题或内容"
            style={{ width: 200 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            placeholder="选择分类"
            style={{ width: 150 }}
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
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/blogs/new')}
        >
          新建博客
        </Button>
      </div>
      <Table
        columns={columns}
        dataSource={blogs}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1200 }}
      />
    </div>
  )
}




