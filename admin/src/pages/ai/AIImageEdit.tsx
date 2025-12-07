import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Space,
  Switch,
  Upload,
  Image,
  Col,
  Row,
} from 'antd'
import { ArrowLeftOutlined, SaveOutlined, UploadOutlined } from '@ant-design/icons'
import api from '../../utils/api'
import { extractErrorMessage } from '../../utils/error'

const { TextArea } = Input

export default function AIImageEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string>('')

  const isEdit = !!id

  useEffect(() => {
    if (isEdit) {
      fetchImage()
    }
  }, [id])

  const fetchImage = async () => {
    try {
      const { data } = await api.get(`/ai-images/${id}`)
      // Convert parameters object to JSON string for display/editing if it exists
      const formData = {
        ...data,
        parameters: data.parameters ? JSON.stringify(data.parameters, null, 2) : '',
      }
      form.setFieldsValue(formData)
      setImageUrl(data.image_url || '')
    } catch (error: any) {
      message.error(extractErrorMessage(error, '获取图片详情失败'))
      navigate('/ai-images')
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
      const thumb = data.thumbnail_url
      setImageUrl(url)
      form.setFieldsValue({ image_url: url, thumbnail_url: thumb })
      message.success('图片上传成功')
      return false
    } catch (error) {
      message.error('图片上传失败')
      return false
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    
    // Parse parameters JSON string back to object
    let parameters = null
    if (values.parameters) {
      try {
        parameters = JSON.parse(values.parameters)
      } catch (e) {
        message.error('参数 JSON 格式错误')
        setLoading(false)
        return
      }
    }

    const payload = {
      ...values,
      parameters,
    }

    try {
      if (isEdit) {
        await api.put(`/ai-images/${id}`, payload)
        message.success('更新成功')
      } else {
        await api.post('/ai-images', payload)
        message.success('创建成功')
      }
      navigate('/ai-images')
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title={isEdit ? '编辑 AI 图片' : '新建 AI 图片'}
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/ai-images')}>
          返回
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{
          is_published: true,
          is_featured: false,
        }}
      >
        <Form.Item name="thumbnail_url" hidden>
          <Input />
        </Form.Item>

        <Row gutter={24}>
          <Col span={12}>
             <Form.Item
              name="image_url"
              label="图片"
              rules={[{ required: true, message: '请上传图片' }]}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Upload beforeUpload={handleUpload} showUploadList={false} accept="image/*">
                  <Button icon={<UploadOutlined />}>上传图片</Button>
                </Upload>
                <Input placeholder="或输入图片 URL" onChange={(e) => setImageUrl(e.target.value)} />
                {imageUrl && (
                  <div style={{ marginTop: 16, border: '1px solid #eee', padding: 4, borderRadius: 4 }}>
                    <Image src={imageUrl} alt="preview" style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain' }} />
                  </div>
                )}
              </Space>
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item name="title" label="标题">
              <Input placeholder="图片标题（可选）" />
            </Form.Item>

            <Form.Item name="category" label="分类">
              <Input placeholder="例如：Stable Diffusion / Midjourney" />
            </Form.Item>

            <Form.Item
              name="tags"
              label="标签"
              tooltip="用逗号分隔"
            >
              <Input placeholder="portrait, cyberpunk, 8k" />
            </Form.Item>

            <Form.Item name="model_name" label="模型名称">
              <Input placeholder="例如：sd_xl_base_1.0.safetensors" />
            </Form.Item>
            
            <Form.Item name="is_featured" valuePropName="checked">
              <Switch checkedChildren="精选" unCheckedChildren="普通" />
            </Form.Item>

            <Form.Item name="is_published" valuePropName="checked">
              <Switch checkedChildren="已发布" unCheckedChildren="草稿" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item name="prompt" label="正向提示词 (Prompt)">
          <TextArea rows={4} placeholder="描述想要生成的画面..." />
        </Form.Item>

        <Form.Item name="negative_prompt" label="反向提示词 (Negative Prompt)">
          <TextArea rows={3} placeholder="描述不想要出现的元素..." />
        </Form.Item>

        <Form.Item
          name="parameters"
          label="生成参数 (JSON)"
          tooltip="例如：Steps, Sampler, CFG scale, Seed 等"
        >
          <TextArea 
            rows={6} 
            placeholder={'{\n  "steps": 20,\n  "sampler": "Euler a",\n  "cfg_scale": 7\n}'} 
            style={{ fontFamily: 'monospace' }}
          />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              {isEdit ? '更新' : '创建'}
            </Button>
            <Button onClick={() => navigate('/ai-images')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}
