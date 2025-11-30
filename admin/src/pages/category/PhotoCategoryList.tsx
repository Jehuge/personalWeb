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
  Upload,
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
  cover_image?: string
  created_at: string
}

export default function PhotoCategoryList() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form] = Form.useForm()
  const [coverImage, setCoverImage] = useState<string>('')

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await api.get('/photos/categories')
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
    setCoverImage('')
    setModalVisible(true)
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    form.setFieldsValue(category)
    setCoverImage(category.cover_image || '')
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/photos/categories/${id}`)
      message.success('删除成功')
      fetchCategories()
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败')
    }
  }

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = response.data.url
      setCoverImage(url)
      form.setFieldsValue({ cover_image: url })
      message.success('图片上传成功')
      return false
    } catch (error) {
      message.error('图片上传失败')
      return false
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingCategory) {
        await api.put(`/photos/categories/${editingCategory.id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/photos/categories', values)
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
        title="摄影分类"
        description="为摄影作品设置主题，搭配封面图片即刻用于前端展示。"
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
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="例如：风景摄影" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="URL标识"
            rules={[{ required: true, message: '请输入URL标识' }]}
            tooltip="用于生成URL，建议使用英文和连字符"
          >
            <Input placeholder="例如：landscape" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="分类描述（可选）" />
          </Form.Item>
          <Form.Item name="cover_image" label="封面图片">
            <Space direction="vertical">
              <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
                <Button>上传图片</Button>
              </Upload>
              {coverImage && (
                <img
                  src={coverImage}
                  alt="封面"
                  style={{ maxWidth: 200, maxHeight: 150, marginTop: 8 }}
                />
              )}
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}




