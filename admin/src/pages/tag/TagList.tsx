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

interface Tag {
  id: number
  name: string
  slug: string
  created_at: string
}

export default function TagList() {
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    setLoading(true)
    try {
      const response = await api.get('/blogs/tags')
      setTags(response.data)
    } catch (error) {
      message.error('获取标签列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingTag(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    form.setFieldsValue(tag)
    setModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/blogs/tags/${id}`)
      message.success('删除成功')
      fetchTags()
    } catch (error: any) {
      message.error(error.response?.data?.detail || '删除失败')
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingTag) {
        await api.put(`/blogs/tags/${editingTag.id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/blogs/tags', values)
        message.success('创建成功')
      }
      setModalVisible(false)
      fetchTags()
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败')
    }
  }

  const columns: ColumnsType<Tag> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '标签名称',
      dataIndex: 'name',
    },
    {
      title: 'URL标识',
      dataIndex: 'slug',
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
            title="确定要删除这个标签吗？"
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
        title="标签管理"
        description="标签帮助搜索与推荐更精准，支持随时维护。"
        stats={[{ label: '标签总数', value: tags.length }]}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchTags}>
              刷新
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新建标签
            </Button>
          </Space>
        }
      />
      <Card className="app-card">
        <Table
          className="app-table"
          columns={columns}
          dataSource={tags}
          rowKey="id"
          loading={loading}
        />
      </Card>
      <Modal
        title={editingTag ? '编辑标签' : '新建标签'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="标签名称"
            rules={[{ required: true, message: '请输入标签名称' }]}
          >
            <Input placeholder="例如：Python" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="URL标识"
            rules={[{ required: true, message: '请输入URL标识' }]}
            tooltip="用于生成URL，建议使用英文和连字符"
          >
            <Input placeholder="例如：python" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

