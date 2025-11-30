import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Modal,
  Form,
  Input,
  Card,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import api from '../../utils/api'
import PageHeader from '../../components/PageHeader'

interface Category {
  id: number
  name: string
  slug: string
  description?: string
  created_at: string
}

export default function BlogCategoryList() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await api.get('/blogs/categories')
      setCategories(response.data)
    } catch (error) {
      message.error('获取分类列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCategory(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    form.setFieldsValue(category)
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/blogs/categories/${id}`)
      message.success('删除成功')
      fetchCategories()
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingCategory) {
        await api.put(`/blogs/categories/${editingCategory.id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/blogs/categories', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchCategories()
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败')
    }
  }

  const columns: ColumnsType<Category> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
    },
    {
      title: 'URL标识',
      dataIndex: 'slug',
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
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
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个分类吗？"
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
        title="博客分类"
        description="分类越清晰，内容结构越有序。可随时增删分类并维护描述。"
        stats={[{ label: '分类总数', value: categories.length }]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchCategories}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建分类
            </Button>
          </Space>
        }
      />
      <Card className="app-card">
        <Table
          className="app-table"
          columns={columns}
          dataSource={categories}
          rowKey="id"
          loading={loading}
        />
      </Card>
      <Modal
        title={editingCategory ? '编辑分类' : '新建分类'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="例如：技术分享" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="URL标识"
            rules={[{ required: true, message: '请输入URL标识' }]}
            tooltip="用于生成URL，建议使用英文和连字符"
          >
            <Input placeholder="例如：tech-share" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="分类描述（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

