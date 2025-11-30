import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Form,
  Input,
  Button,
  Select,
  Switch,
  message,
  Card,
  Space,
  Upload,
} from 'antd'
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import api from '../../utils/api'

const { TextArea } = Input
const { Option } = Select

export default function BlogEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [tags, setTags] = useState<any[]>([])
  const [coverImage, setCoverImage] = useState<string>('')

  const isEdit = !!id

  useEffect(() => {
    fetchCategories()
    fetchTags()
    if (isEdit) {
      fetchBlog()
    }
  }, [id])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/blogs/categories')
      setCategories(response.data)
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }

  const fetchTags = async () => {
    try {
      const response = await api.get('/blogs/tags')
      setTags(response.data)
    } catch (error) {
      console.error('获取标签失败:', error)
    }
  }

  const fetchBlog = async () => {
    try {
      const response = await api.get(`/blogs/${id}`)
      const blog = response.data
      form.setFieldsValue({
        ...blog,
        category_id: blog.category?.id,
        tag_ids: blog.tags?.map((t: any) => t.id) || [],
      })
      setCoverImage(blog.cover_image || '')
    } catch (error) {
      message.error('获取博客详情失败')
      navigate('/blogs')
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
      return false // 阻止默认上传
    } catch (error) {
      message.error('图片上传失败')
      return false
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    try {
      if (isEdit) {
        await api.put(`/blogs/${id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/blogs', values)
        message.success('创建成功')
      }
      navigate('/blogs')
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card
        title={isEdit ? '编辑博客' : '新建博客'}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/blogs')}>
            返回
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ is_published: false }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入博客标题" />
          </Form.Item>

          <Form.Item
            name="slug"
            label="URL Slug"
            rules={[{ required: true, message: '请输入slug' }]}
            tooltip="用于生成URL，建议使用英文和连字符"
          >
            <Input placeholder="例如: my-first-blog-post" />
          </Form.Item>

          <Form.Item name="category_id" label="分类">
            <Select placeholder="选择分类" allowClear>
              {categories.map((cat) => (
                <Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="tag_ids" label="标签">
            <Select
              mode="multiple"
              placeholder="选择标签"
              allowClear
            >
              {tags.map((tag) => (
                <Option key={tag.id} value={tag.id}>
                  {tag.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="excerpt" label="摘要">
            <TextArea
              rows={3}
              placeholder="输入文章摘要（可选）"
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
                <img
                  src={coverImage}
                  alt="封面"
                  style={{ maxWidth: 300, maxHeight: 200, marginTop: 8 }}
                />
              )}
            </Space>
          </Form.Item>

          <Form.Item name="content" label="内容" rules={[{ required: true, message: '请输入内容' }]}>
            <TextArea
              rows={15}
              placeholder="使用Markdown格式编写内容"
            />
          </Form.Item>

          <Form.Item name="is_published" valuePropName="checked">
            <Switch checkedChildren="已发布" unCheckedChildren="草稿" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={() => navigate('/blogs')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}




