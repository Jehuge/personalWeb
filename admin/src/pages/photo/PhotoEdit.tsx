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
  Image,
} from 'antd'
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import api from '../../utils/api'

const { TextArea } = Input
const { Option } = Select

export default function PhotoEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [imageUrl, setImageUrl] = useState<string>('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('')

  const isEdit = !!id

  useEffect(() => {
    fetchCategories()
    if (isEdit) {
      fetchPhoto()
    }
  }, [id])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/photos/categories')
      setCategories(response.data)
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }

  const fetchPhoto = async () => {
    try {
      const response = await api.get(`/photos/${id}`)
      const photo = response.data
      form.setFieldsValue({
        ...photo,
        category_id: photo.category?.id,
      })
      setImageUrl(photo.image_url)
      setThumbnailUrl(photo.thumbnail_url || photo.image_url)
    } catch (error) {
      message.error('获取照片详情失败')
      navigate('/photos')
    }
  }

  const handleUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const { url, thumbnail_url, width, height, file_size } = response.data
      setImageUrl(url)
      setThumbnailUrl(thumbnail_url || url)
      form.setFieldsValue({
        image_url: url,
        thumbnail_url: thumbnail_url || url,
        width,
        height,
        file_size,
      })
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
        await api.put(`/photos/${id}`, values)
        message.success('更新成功')
      } else {
        await api.post('/photos', values)
        message.success('创建成功')
      }
      navigate('/photos')
    } catch (error: any) {
      message.error(error.response?.data?.detail || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Card
        title={isEdit ? '编辑照片' : '上传照片'}
        extra={
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/photos')}>
            返回
          </Button>
        }
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ is_featured: false }}
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="请输入照片标题" />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <TextArea
              rows={4}
              placeholder="输入照片描述（可选）"
            />
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

          <Form.Item
            name="image_url"
            label="图片"
            rules={[{ required: true, message: '请上传图片' }]}
          >
            <Space direction="vertical">
              <Upload
                beforeUpload={handleUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button>上传图片</Button>
              </Upload>
              {imageUrl && (
                <div>
                  <Image
                    src={thumbnailUrl}
                    alt="预览"
                    style={{ maxWidth: 400, maxHeight: 300 }}
                  />
                </div>
              )}
            </Space>
          </Form.Item>

          {/* 隐藏字段：保存图片元数据 */}
          <Form.Item name="thumbnail_url" hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item name="width" hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item name="height" hidden>
            <Input type="hidden" />
          </Form.Item>
          <Form.Item name="file_size" hidden>
            <Input type="hidden" />
          </Form.Item>

          <Form.Item name="is_featured" valuePropName="checked">
            <Switch checkedChildren="精选" unCheckedChildren="普通" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                {isEdit ? '更新' : '创建'}
              </Button>
              <Button onClick={() => navigate('/photos')}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}




