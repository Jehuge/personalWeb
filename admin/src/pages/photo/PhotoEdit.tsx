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
  DatePicker,
  Row,
  Col,
  Typography,
} from 'antd'
import { SaveOutlined, ArrowLeftOutlined, UploadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader from '../../components/PageHeader'
import api from '../../utils/api'
import { extractErrorMessage } from '../../utils/error'

const { TextArea } = Input
const { Option } = Select
const { Title, Text } = Typography

type ImageMeta = {
  width: number | null
  height: number | null
  file_size: number | null
}

type ExifSummary = {
  make?: string
  model?: string
  focal_length?: string
  aperture?: string
  shutter_speed?: string
  iso?: string
  shoot_time?: string
}

const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="photo-edit-section__title">
    <Title level={5} style={{ marginBottom: 4 }}>
      {title}
    </Title>
    {subtitle && (
      <Text type="secondary" style={{ fontSize: 13 }}>
        {subtitle}
      </Text>
    )}
  </div>
)

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return '——'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

export default function PhotoEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [imageUrl, setImageUrl] = useState<string>('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [exifMeta, setExifMeta] = useState<Record<string, any> | null>(null)
  const [exifSummary, setExifSummary] = useState<ExifSummary | null>(null)
  const [imageMeta, setImageMeta] = useState<ImageMeta>({
    width: null,
    height: null,
    file_size: null,
  })

  const isEdit = !!id
  const revokePreview = () =>
    setLocalPreview((prev) => {
      if (prev) {
        URL.revokeObjectURL(prev)
      }
      return null
    })

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview)
      }
    }
  }, [localPreview])

  useEffect(() => {
    fetchCategories()
    if (isEdit) {
      fetchPhoto()
    } else {
      syncExifFields()
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

  const syncExifFields = (payload?: any) => {
    if (!payload) {
      setExifMeta(null)
      setExifSummary(null)
      form.setFieldsValue({
        make: undefined,
        model: undefined,
        focal_length: undefined,
        aperture: undefined,
        shutter_speed: undefined,
        iso: undefined,
        shoot_time: null,
      })
      return
    }

    setExifMeta(payload.exif || null)
    const summary: ExifSummary = {
      make: payload.make || undefined,
      model: payload.model || undefined,
      focal_length: payload.focal_length || undefined,
      aperture: payload.aperture || undefined,
      shutter_speed: payload.shutter_speed || undefined,
      iso: payload.iso ? String(payload.iso) : undefined,
      shoot_time: payload.shoot_time || undefined,
    }
    const hasSummary = Object.values(summary).some(Boolean)
    setExifSummary(hasSummary ? summary : null)

    form.setFieldsValue({
      make: payload.make || undefined,
      model: payload.model || undefined,
      focal_length: payload.focal_length || undefined,
      aperture: payload.aperture || undefined,
      shutter_speed: payload.shutter_speed || undefined,
      iso: payload.iso ? String(payload.iso) : undefined,
      shoot_time: payload.shoot_time ? dayjs(payload.shoot_time) : null,
    })
  }

  const fetchPhoto = async () => {
    try {
      const response = await api.get(`/photos/${id}`)
      const photo = response.data
      form.setFieldsValue({
        ...photo,
        category_id: photo.category?.id,
        shoot_time: photo.shoot_time ? dayjs(photo.shoot_time) : null,
      })
      syncExifFields(photo)
      setImageUrl(photo.image_url)
      setThumbnailUrl(photo.thumbnail_url || photo.image_url)
      setPendingFile(null)
      revokePreview()
      setImageMeta({
        width: photo.width || null,
        height: photo.height || null,
        file_size: photo.file_size || null,
      })
    } catch (error) {
      message.error(extractErrorMessage(error, '获取照片详情失败'))
      navigate('/photos')
    }
  }

  const handleUpload = async (file: File) => {
    revokePreview()
    setPendingFile(file)
    const preview = URL.createObjectURL(file)
    setLocalPreview(preview)
    setImageUrl('')
    setThumbnailUrl('')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await api.post('/upload/image/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const { width, height, file_size } = response.data
      setImageMeta({
        width: width || null,
        height: height || null,
        file_size: file_size || null,
      })
      syncExifFields(response.data)
      message.success('图片解析成功')
    } catch (error) {
      revokePreview()
      setPendingFile(null)
      message.error(extractErrorMessage(error, '解析图片失败'))
    }

    return false
  }

  const normalizeShootTime = (value: any) => {
    if (!value) return undefined
    if (typeof value.toISOString === 'function') {
      return value.toISOString()
    }
    return value
  }

  const buildFormPayload = (values: any, skipImageMeta: boolean) => {
    // 清理空字符串，转换为 null
    const cleanValue = (val: any) => (val === '' ? null : val)
    
    const payload: Record<string, any> = {
      title: values.title,
      description: cleanValue(values.description),
      category_id: values.category_id,
      is_featured: values.is_featured,
      make: cleanValue(values.make),
      model: cleanValue(values.model),
      focal_length: cleanValue(values.focal_length),
      aperture: cleanValue(values.aperture),
      shutter_speed: cleanValue(values.shutter_speed),
      iso: cleanValue(values.iso),
    }

    const shootTimeValue = normalizeShootTime(values.shoot_time)
    if (shootTimeValue) {
      payload.shoot_time = shootTimeValue
    }

    if (!skipImageMeta) {
      payload.image_url = values.image_url
      payload.thumbnail_url = cleanValue(values.thumbnail_url)
      payload.width = values.width
      payload.height = values.height
      payload.file_size = values.file_size
    }

    // 移除 null 或 undefined 的 category_id
    if (payload.category_id === undefined || payload.category_id === null) {
      delete payload.category_id
    }

    // exif 字段格式：使用 with-file 端点时需要字符串，使用普通 PUT 端点时需要对象
    if (exifMeta) {
      if (skipImageMeta) {
        // 使用 with-file 端点，exif 需要是字符串
        payload.exif = JSON.stringify(exifMeta)
      } else {
        // 使用普通 PUT 端点，exif 需要是对象
        payload.exif = exifMeta
      }
    }

    return payload
  }

  const appendFormField = (formData: FormData, key: string, value: any) => {
    if (value === undefined || value === null || value === '') {
      return
    }
    const normalized =
      typeof value === 'boolean'
        ? String(value)
        : typeof value === 'number'
          ? String(value)
          : value
    formData.append(key, normalized)
  }

  const onFinish = async (values: any) => {
    if (!isEdit && !pendingFile) {
      message.error('请先选择图片')
      return
    }
    setLoading(true)
    try {
      const skipImageMeta = Boolean(pendingFile)
      const payload = buildFormPayload(values, skipImageMeta)

      if (pendingFile) {
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => appendFormField(formData, key, value))
        formData.append('file', pendingFile)

        if (isEdit) {
          await api.put(`/photos/${id}/with-file`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          message.success('更新成功')
        } else {
          await api.post('/photos/with-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          message.success('创建成功')
        }
      } else if (isEdit) {
        await api.put(`/photos/${id}`, payload)
        message.success('更新成功')
      } else {
        message.error('请先选择图片')
        return
      }

      navigate('/photos')
    } catch (error: any) {
      message.error(extractErrorMessage(error, '操作失败'))
    } finally {
      setLoading(false)
    }
  }

  const renderPreviewCard = () => {
    const previewSource = localPreview || thumbnailUrl || imageUrl
    const thumbnailState = localPreview
      ? '待上传'
      : thumbnailUrl && thumbnailUrl !== imageUrl
        ? '已生成'
        : '默认'

    return (
      <Card
        className="photo-edit-side-card"
        title="实时预览"
        styles={{ body: { padding: 16 } }}
      >
        {previewSource ? (
          <>
            <div className="photo-edit-preview">
              <Image
                src={previewSource}
                alt="预览"
                preview={localPreview ? false : { src: imageUrl }}
                style={{ width: '100%', borderRadius: 16 }}
              />
            </div>
            <div className="photo-edit-meta-grid">
              <div>
                <span className="meta-label">尺寸</span>
                <span className="meta-value">
                  {imageMeta.width && imageMeta.height
                    ? `${imageMeta.width} × ${imageMeta.height}`
                    : '——'}
                </span>
              </div>
              <div>
                <span className="meta-label">文件大小</span>
                <span className="meta-value">{formatFileSize(imageMeta.file_size)}</span>
              </div>
              <div>
                <span className="meta-label">缩略图</span>
                <span className="meta-value">{thumbnailState}</span>
              </div>
            </div>
            {!localPreview && imageUrl && (
              <Button
                block
                type="link"
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                style={{ padding: 0 }}
              >
                在新标签打开原图
              </Button>
            )}
          </>
        ) : (
          <div className="photo-edit-empty">
            <p>暂未选择图片</p>
            <Text type="secondary">选择图片后即可预览与解析 EXIF</Text>
          </div>
        )}
      </Card>
    )
  }

  const renderExifSummaryCard = () => {
    const readableTime = exifSummary?.shoot_time
      ? dayjs(exifSummary.shoot_time).format('YYYY-MM-DD HH:mm:ss')
      : '——'
    const summaryItems = [
      { label: '相机', value: [exifSummary?.make, exifSummary?.model].filter(Boolean).join(' ') || '——' },
      { label: '焦距', value: exifSummary?.focal_length || '——' },
      { label: '光圈', value: exifSummary?.aperture || '——' },
      { label: '快门', value: exifSummary?.shutter_speed || '——' },
      { label: 'ISO', value: exifSummary?.iso || '——' },
      { label: '拍摄时间', value: readableTime },
    ]

    return (
      <Card
        className="photo-edit-side-card"
        title="拍摄参数概览"
        styles={{ body: { padding: 16 } }}
      >
        {exifSummary ? (
          <div className="photo-edit-exif-grid">
            {summaryItems.map((item) => (
              <div key={item.label}>
                <span className="meta-label">{item.label}</span>
                <span className="meta-value">{item.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="photo-edit-empty">
            <p>等待解析 EXIF</p>
            <Text type="secondary">上传原图后自动提取，可在表单里手动微调</Text>
          </div>
        )}
      </Card>
    )
  }

  const hasSelectedImage = Boolean(pendingFile || imageUrl)
  const headerStats = [
    { label: '当前模式', value: isEdit ? '编辑照片' : '上传新图' },
    { label: '素材状态', value: hasSelectedImage ? '已选择素材' : '未上传' },
    { label: 'EXIF 解析', value: exifSummary ? '已解析' : hasSelectedImage ? '解析中' : '待解析' },
  ]

  const handleCancel = () => {
    navigate('/photos')
  }

  return (
    <div className="photo-edit-shell">
      <PageHeader
        title={isEdit ? '编辑照片' : '上传照片'}
        description="统一管理作品素材，完善文案信息与拍摄参数，确保前台展示体验一致"
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleCancel}>
              返回列表
            </Button>
          </Space>
        }
        stats={headerStats}
      />

      <div className="photo-edit-grid">
        <Card className="photo-edit-card" styles={{ body: { padding: 24 } }}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onFinish}
            initialValues={{ is_featured: false }}
          >
            <section className="photo-edit-section">
              <SectionHeader title="基础信息" subtitle="这些内容会直接展示在前台" />
              <Row gutter={16}>
                <Col xs={24} md={14}>
                  <Form.Item
                    name="title"
                    label="标题"
                    rules={[{ required: true, message: '请输入标题' }]}
                  >
                    <Input placeholder="请输入照片标题" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={10}>
                  <Form.Item name="category_id" label="分类">
                    <Select placeholder="选择分类" allowClear>
                      {categories.map((cat) => (
                        <Option key={cat.id} value={cat.id}>
                          {cat.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="描述">
                <TextArea rows={4} placeholder="输入照片描述（可选）" />
              </Form.Item>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="shoot_time" label="拍摄时间">
                    <DatePicker
                      showTime
                      allowClear
                      style={{ width: '100%' }}
                      placeholder="选择拍摄时间"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="is_featured"
                    label="精选展示"
                    valuePropName="checked"
                    tooltip="开启后会优先出现在首页精选区域"
                  >
                    <Switch checkedChildren="精选" unCheckedChildren="普通" />
                  </Form.Item>
                </Col>
              </Row>
            </section>

            <section className="photo-edit-section">
              <SectionHeader title="图片资源" subtitle="上传原图后会自动生成缩略图与 EXIF 信息" />
              <Form.Item
                label="图片文件"
                required={!isEdit}
                validateStatus={!isEdit && !pendingFile && !imageUrl ? 'error' : undefined}
                help={!isEdit && !pendingFile && !imageUrl ? '请上传图片' : undefined}
              >
                <Upload
                  beforeUpload={handleUpload}
                  showUploadList={false}
                  accept="image/*"
                  maxCount={1}
                  className="photo-edit-upload"
                >
                  <Button icon={<UploadOutlined />} block>
                    {imageUrl ? '重新上传' : '上传图片'}
                  </Button>
                </Upload>
              </Form.Item>
              <Form.Item name="image_url" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Text type="secondary" style={{ fontSize: 12 }}>
                推荐上传长边不低于 2000px 的高清素材，支持 JPG/PNG/WebP
              </Text>

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
            </section>

            <section className="photo-edit-section">
              <SectionHeader title="拍摄参数" subtitle="可基于自动解析的结果进行微调" />
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="make" label="相机品牌">
                    <Input placeholder="自动识别，可手动调整" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="model" label="相机型号">
                    <Input placeholder="自动识别，可手动调整" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="focal_length" label="焦距">
                    <Input placeholder="例如 35mm" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="aperture" label="光圈">
                    <Input placeholder="例如 f/2.8" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="shutter_speed" label="快门">
                    <Input placeholder="例如 1/125s" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="iso" label="ISO">
                    <Input placeholder="例如 100" />
                  </Form.Item>
                </Col>
              </Row>
            </section>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                  {isEdit ? '更新' : '创建'}
                </Button>
                <Button onClick={handleCancel}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <div className="photo-edit-side">
          {renderPreviewCard()}
          {renderExifSummaryCard()}
          <Card
            className="photo-edit-side-card"
            title="发布小贴士"
            styles={{ body: { padding: 16 } }}
          >
            <ul className="photo-edit-tips">
              <li>描述中可补充拍摄地点、天气等故事性信息。</li>
              <li>若自动 EXIF 不准确，可在左侧参数区快速修改。</li>
              <li>开启“精选展示”后，素材将优先出现在首页推荐位。</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}




