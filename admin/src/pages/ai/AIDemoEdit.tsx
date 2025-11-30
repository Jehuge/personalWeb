import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  message,
  Space,
  Switch,
  Upload,
  Image,
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import api from '../../utils/api'

const { TextArea } = Input

interface AIDemoForm {
  title: string
  slug: string
  description?: string
  cover_image?: string
  category?: string
  tags?: string
  bundle_path?: string
  entry_file?: string
  external_url?: string
  iframe_height?: number
  is_featured?: boolean
  is_published?: boolean
  sort_order?: number
}

export default function AIDemoEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm<AIDemoForm>()
  const [loading, setLoading] = useState(false)
  const [coverImage, setCoverImage] = useState<string>('')

  const isEdit = !!id

  useEffect(() => {
    if (isEdit) {
      fetchDemo()
    }
  }, [id])

  const fetchDemo = async () => {
    try {
      const { data } = await api.get(`/ai-demos/${id}`)
      form.setFieldsValue(data)
      setCoverImage(data.cover_image || '')
    } catch (error) {
      message.error('获取 Demo 详情失败')
      navigate('/ai-demos')
    }
  }

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = data.url
      setCoverImage(url)
      form.setFieldsValue({ cover_image: url })
      message.success('图片上传成功')
      return false
    } catch (error) {
      message.error('图片上传失败')
      return false
    }
  }

  const onFinish = async (values: AIDemoForm) => {
    setLoading(true)
    const payload = {
      ...values,
      bundle_path: values.bundle_path || values.slug,
    }
    try {
      if (isEdit) {
        await api.put(`/ai-demos/${id}`, payload)
        message.success('更新成功')
      } else {
        await api.post('/ai-demos', payload)
        message.success('创建成功')
      }
      navigate('/ai-demos')
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={isEdit ? '编辑 Demo' : '新建 Demo'}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/ai-demos')}>
          返回
        </Button>
      }
    >
      <Form<AIDemoForm>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          is_published: false,
          is_featured: false,
          entry_file: 'index.html',
          sort_order: 0,
        }}
      >
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input placeholder="Neon Particles" />
        </Form.Item>

        <Form.Item
          name="slug"
          label="Slug"
          rules={[{ required: true, message: '请输入 slug' }]}
          tooltip="用于拼接 URL，建议使用英文小写和连字符"
        >
          <Input placeholder="neon-particles" />
        </Form.Item>

        <Form.Item
          name="description"
          label="简介"
        >
          <TextArea rows={3} placeholder="一句话介绍这个 Demo" />
        </Form.Item>

        <Form.Item name="category" label="分类">
          <Input placeholder="例如：视觉 / 交互 / 游戏" />
        </Form.Item>

        <Form.Item
          name="tags"
          label="标签"
          tooltip="用逗号分隔，例如：webgl, shaders"
        >
          <Input placeholder="webgl, neon, particles" />
        </Form.Item>

        <Form.Item name="cover_image" label="封面图">
          <Space direction="vertical">
            <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
              <Button>上传封面</Button>
            </Upload>
            {coverImage && <Image src={coverImage} alt="cover" style={{ maxWidth: 320 }} />}
          </Space>
        </Form.Item>

        <Form.Item
          name="bundle_path"
          label="静态目录（相对 aiLab）"
          tooltip="例如 demo1 或 space/star；为空时默认使用 slug"
        >
          <Input placeholder="game1 或 neon/space" />
        </Form.Item>

        <Form.Item name="entry_file" label="入口文件">
          <Input placeholder="index.html" />
        </Form.Item>

        <Form.Item
          name="external_url"
          label="外部地址（可选）"
          tooltip="若填写，则优先跳转到这个地址"
        >
          <Input placeholder="https://codesandbox.io/..." />
        </Form.Item>

        <Form.Item name="iframe_height" label="默认 iframe 高度">
          <InputNumber min={200} max={2000} placeholder="例如 640" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="sort_order" label="排序">
          <InputNumber min={0} style={{ width: '100%' }} />
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
            <Button onClick={() => navigate('/ai-demos')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}







