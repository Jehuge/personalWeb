import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Form,
  Input,
  Button,
  Switch,
  message,
  Card,
  Space,
  Upload,
  Image,
} from 'antd'
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import api from '../../utils/api'
import { extractErrorMessage } from '../../utils/error'

const { TextArea } = Input

export default function AIProjectEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [coverImage, setCoverImage] = useState<string>('')

  const isEdit = !!id

  useEffect(() => {
    if (isEdit) {
      fetchProject()
    }
  }, [id])

  const fetchProject = async () => {
    try {
      const response = await api.get(`/ai-projects/${id}`)
      const project = response.data
      form.setFieldsValue(project)
      setCoverImage(project.cover_image || '')
    } catch (error: any) {
      message.error(extractErrorMessage(error, '获取项目详情失败'))
      navigate('/ai-projects')
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

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/ai-projects/${id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/ai-projects', values)
        message.success('创建成功')
      }
      navigate('/ai-projects')
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card
        title={isEdit ? '编辑AI项目' : '新建AI项目'}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/ai-projects')}>
            返回
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ is_published: false, is_featured: false }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入项目标题" />
          </Form.Item>

          <Form.Item
            name="slug"
            label="URL Slug"
            rules={[{ required: true, message: '请输入slug' }]}
            tooltip="用于生成URL，建议使用英文和连字符"
          >
            <Input placeholder="例如: my-ai-project" />
          </Form.Item>

          <Form.Item name="description" label="简短描述">
            <TextArea
              rows={3}
              placeholder="输入项目简短描述"
            />
          </Form.Item>

          <Form.Item name="content" label="详细介绍">
            <TextArea
              rows={8}
              placeholder="输入项目详细介绍（支持Markdown）"
            />
          </Form.Item>

          <Form.Item name="cover_image" label="封面图片">
            <Space direction="vertical">
              <Upload
                beforeUpload={handleUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button>上传图片</Button>
              </Upload>
              {coverImage && (
                <Image
                  src={coverImage}
                  alt="封面"
                  style={{ maxWidth: 300, maxHeight: 200 }}
                />
              )}
            </Space>
          </Form.Item>

          <Form.Item name="demo_url" label="演示地址">
            <Input placeholder="https://example.com" />
          </Form.Item>

          <Form.Item name="github_url" label="GitHub地址">
            <Input placeholder="https://github.com/username/repo" />
          </Form.Item>

          <Form.Item name="tech_stack" label="技术栈">
            <Input placeholder="例如: Python, FastAPI, React, TensorFlow" />
          </Form.Item>

          <Form.Item name="is_featured" valuePropName="checked">
            <Switch checkedChildren="精选" unCheckedChildren="普通" />
          </Form.Item>

          <Form.Item name="is_published" valuePropName="checked">
            <Switch checkedChildren="已发布" unCheckedChildren="草稿" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={() => navigate('/ai-projects')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}




