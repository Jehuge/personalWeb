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
  DatePicker,
  Row,
  Col,
  Typography,
  Progress,
  Image,
} from 'antd'
import { SaveOutlined, ArrowLeftOutlined, UploadOutlined, PlayCircleOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import PageHeader from '../../components/PageHeader'
import api from '../../utils/api'
import { extractErrorMessage } from '../../utils/error'

const { TextArea } = Input
const { Option } = Select
const { Title, Text } = Typography

type VideoMeta = {
  duration?: number
  width?: number
  height?: number
  file_size?: number
  format?: string
  codec?: string
  fps?: number
  bitrate?: number
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

const formatDuration = (seconds?: number) => {
  if (!seconds) return '——'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return '——'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function VideoEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [categories, setCategories] = useState<any[]>([])
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('')
  const [coverImage, setCoverImage] = useState<string>('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [videoMeta, setVideoMeta] = useState<VideoMeta>({})

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
      fetchVideo()
    }
  }, [id])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/videos/categories')
      setCategories(response.data)
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }

  const fetchVideo = async () => {
    try {
      const response = await api.get(`/videos/${id}`)
      const video = response.data
      form.setFieldsValue({
        ...video,
        category_id: video.category?.id,
        published_at: video.published_at ? dayjs(video.published_at) : null,
      })
      setVideoUrl(video.video_url)
      setThumbnailUrl(video.thumbnail_video_url || video.video_url)
      setCoverImage(video.cover_image || '')
      setPendingFile(null)
      revokePreview()
      setVideoMeta({
        duration: video.duration,
        width: video.width,
        height: video.height,
        file_size: video.file_size,
        format: video.format,
        codec: video.codec,
        fps: video.fps,
        bitrate: video.bitrate,
      })
    } catch (error) {
      message.error(extractErrorMessage(error, '获取视频详情失败'))
      navigate('/videos')
    }
  }

  const handleVideoUpload = async (file: File) => {
    // 检查文件类型
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|webm)$/i)) {
      message.error('不支持的视频格式，请上传 MP4、MOV、AVI 或 WebM 格式')
      return false
    }

    // 检查文件大小（最大500MB）
    const maxSize = 500 * 1024 * 1024
    if (file.size > maxSize) {
      message.error('视频文件大小不能超过500MB')
      return false
    }

    revokePreview()
    setPendingFile(file)
    const preview = URL.createObjectURL(file)
    setLocalPreview(preview)
    setVideoUrl('')
    setThumbnailUrl('')
    setVideoMeta({})
    message.info('视频已选择，点击上传按钮开始处理并上传')
    return false
  }

  const handleCoverImageUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const url = response.data.url
      setCoverImage(url)
      form.setFieldsValue({ cover_image: url })
      message.success('封面图片上传成功')
      return false
    } catch (error) {
      message.error('封面图片上传失败')
      return false
    }
  }

  const normalizePublishedAt = (value: any) => {
    if (!value) return undefined
    if (typeof value.toISOString === 'function') {
      return value.toISOString()
    }
    return value
  }

  const buildFormPayload = (values: any, skipVideoMeta: boolean) => {
    const cleanValue = (val: any) => (val === '' ? null : val)
    
    const payload: Record<string, any> = {
      title: values.title,
      description: cleanValue(values.description),
      category_id: values.category_id,
      is_featured: values.is_featured,
      is_published: values.is_published,
      cover_image: cleanValue(values.cover_image),
    }

    const publishedAtValue = normalizePublishedAt(values.published_at)
    if (publishedAtValue) {
      payload.published_at = publishedAtValue
    }

    if (!skipVideoMeta) {
      payload.video_url = values.video_url
      payload.thumbnail_video_url = cleanValue(values.thumbnail_video_url)
      payload.duration = values.duration
      payload.width = values.width
      payload.height = values.height
      payload.file_size = values.file_size
      payload.thumbnail_file_size = values.thumbnail_file_size
      payload.format = values.format
      payload.codec = values.codec
      payload.fps = values.fps
      payload.bitrate = values.bitrate
    }

    if (payload.category_id === undefined || payload.category_id === null) {
      delete payload.category_id
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
      message.error('请先选择视频文件')
      return
    }
    
    setLoading(true)
    setUploading(!!pendingFile)
    setUploadProgress(0)
    
    try {
      const skipVideoMeta = Boolean(pendingFile)
      const payload = buildFormPayload(values, skipVideoMeta)

      if (pendingFile) {
        // 上传视频文件（包含处理）
        const formData = new FormData()
        Object.entries(payload).forEach(([key, value]) => appendFormField(formData, key, value))
        formData.append('file', pendingFile)

        // 模拟上传进度（实际进度由后端处理决定）
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 500)

        try {
          if (isEdit) {
            // 编辑模式下，先删除旧视频，然后创建新的
            await api.delete(`/videos/${id}`)
            await api.post('/videos/with-file', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 600000, // 10分钟超时，视频处理需要较长时间
            })
            message.success('更新成功')
          } else {
            await api.post('/videos/with-file', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 600000, // 10分钟超时，视频处理需要较长时间
            })
            message.success('创建成功')
          }
          clearInterval(progressInterval)
          setUploadProgress(100)
        } catch (error) {
          clearInterval(progressInterval)
          throw error
        }
      } else if (isEdit) {
        await api.put(`/videos/${id}`, payload)
        message.success('更新成功')
      } else {
        message.error('请先选择视频文件')
        return
      }

      navigate('/videos')
    } catch (error: any) {
      message.error(extractErrorMessage(error, '操作失败'))
    } finally {
      setLoading(false)
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const renderPreviewCard = () => {
    const previewSource = localPreview || thumbnailUrl || videoUrl
    const thumbnailState = localPreview
      ? '待处理'
      : thumbnailUrl && thumbnailUrl !== videoUrl
        ? '已生成'
        : '默认'

    return (
      <Card
        className="photo-edit-side-card"
        title="视频预览"
        styles={{ body: { padding: 16 } }}
      >
        {previewSource ? (
          <>
            <div className="photo-edit-preview">
              <video
                src={previewSource}
                controls
                style={{ width: '100%', borderRadius: 16, maxHeight: 300 }}
              />
            </div>
            <div className="photo-edit-meta-grid">
              <div>
                <span className="meta-label">时长</span>
                <span className="meta-value">{formatDuration(videoMeta.duration)}</span>
              </div>
              <div>
                <span className="meta-label">分辨率</span>
                <span className="meta-value">
                  {videoMeta.width && videoMeta.height
                    ? `${videoMeta.width} × ${videoMeta.height}`
                    : '——'}
                </span>
              </div>
              <div>
                <span className="meta-label">文件大小</span>
                <span className="meta-value">{formatFileSize(videoMeta.file_size)}</span>
              </div>
              <div>
                <span className="meta-label">格式</span>
                <span className="meta-value">{videoMeta.format || '——'}</span>
              </div>
              <div>
                <span className="meta-label">编码</span>
                <span className="meta-value">{videoMeta.codec || '——'}</span>
              </div>
              <div>
                <span className="meta-label">帧率</span>
                <span className="meta-value">{videoMeta.fps ? `${videoMeta.fps} fps` : '——'}</span>
              </div>
              <div>
                <span className="meta-label">缩略视频</span>
                <span className="meta-value">{thumbnailState}</span>
              </div>
            </div>
            {uploading && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                  正在处理并上传视频...
                </Text>
                <Progress percent={uploadProgress} status="active" />
              </div>
            )}
            {!localPreview && videoUrl && (
              <Button
                block
                type="link"
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                icon={<PlayCircleOutlined />}
                style={{ padding: 0, marginTop: 12 }}
              >
                在新标签打开视频
              </Button>
            )}
          </>
        ) : (
          <div className="photo-edit-empty">
            <p>暂未选择视频</p>
            <Text type="secondary">选择视频后即可预览</Text>
          </div>
        )}
      </Card>
    )
  }

  const hasSelectedVideo = Boolean(pendingFile || videoUrl)
  const headerStats = [
    { label: '当前模式', value: isEdit ? '编辑视频' : '上传新视频' },
    { label: '素材状态', value: hasSelectedVideo ? '已选择素材' : '未上传' },
    { label: '处理状态', value: uploading ? '处理中' : hasSelectedVideo ? '待处理' : '待选择' },
  ]

  const handleCancel = () => {
    navigate('/videos')
  }

  return (
    <div className="photo-edit-shell">
      <PageHeader
        title={isEdit ? '编辑视频' : '上传视频'}
        description="统一管理视频素材，完善文案信息，系统会自动生成高质量缩略视频"
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
            initialValues={{ is_featured: false, is_published: false }}
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
                    <Input placeholder="请输入视频标题" />
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
                <TextArea rows={4} placeholder="输入视频描述（可选）" />
              </Form.Item>
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item name="published_at" label="发布时间">
                    <DatePicker
                      showTime
                      allowClear
                      style={{ width: '100%' }}
                      placeholder="选择发布时间"
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
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="is_published"
                    label="发布状态"
                    valuePropName="checked"
                    tooltip="开启后视频将对外展示"
                  >
                    <Switch checkedChildren="已发布" unCheckedChildren="未发布" />
                  </Form.Item>
                </Col>
              </Row>
            </section>

            <section className="photo-edit-section">
              <SectionHeader title="视频资源" subtitle="上传视频后会自动生成高质量缩略视频（最多30秒，最大1920x1080）" />
              <Form.Item
                label="视频文件"
                required={!isEdit}
                validateStatus={!isEdit && !pendingFile && !videoUrl ? 'error' : undefined}
                help={!isEdit && !pendingFile && !videoUrl ? '请上传视频' : undefined}
              >
                <Upload
                  beforeUpload={handleVideoUpload}
                  showUploadList={false}
                  accept="video/*"
                  maxCount={1}
                  className="photo-edit-upload"
                >
                  <Button icon={<UploadOutlined />} block>
                    {videoUrl ? '重新上传' : '选择视频'}
                  </Button>
                </Upload>
              </Form.Item>
              <Text type="secondary" style={{ fontSize: 12 }}>
                支持 MP4、MOV、AVI、WebM 格式，最大 500MB。上传后会在本地使用 ffmpeg 处理生成缩略视频，然后上传到 OSS。
              </Text>
            </section>

            <section className="photo-edit-section">
              <SectionHeader title="封面图片" subtitle="上传视频封面图片，用于列表页展示（推荐尺寸：16:9）" />
              <Form.Item name="cover_image" label="封面图片">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Upload
                    beforeUpload={handleCoverImageUpload}
                    showUploadList={false}
                    accept="image/*"
                  >
                    <Button icon={<UploadOutlined />}>
                      {coverImage ? '重新上传封面' : '上传封面图片'}
                    </Button>
                  </Upload>
                  {coverImage && (
                    <Image
                      src={coverImage}
                      alt="封面"
                      style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
                      preview={false}
                    />
                  )}
                </Space>
              </Form.Item>
              <Text type="secondary" style={{ fontSize: 12 }}>
                封面图片会在视频列表页显示，鼠标悬停时会自动播放预览视频。推荐使用 16:9 比例的图片。
              </Text>

              {/* 隐藏字段，用于存储视频元数据 */}
              <Form.Item name="video_url" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Form.Item name="thumbnail_video_url" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Form.Item name="duration" hidden>
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
              <Form.Item name="thumbnail_file_size" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Form.Item name="format" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Form.Item name="codec" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Form.Item name="fps" hidden>
                <Input type="hidden" />
              </Form.Item>
              <Form.Item name="bitrate" hidden>
                <Input type="hidden" />
              </Form.Item>
            </section>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
                  {isEdit ? '更新' : '创建并上传'}
                </Button>
                <Button onClick={handleCancel}>取消</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        <div className="photo-edit-side">
          {renderPreviewCard()}
          <Card
            className="photo-edit-side-card"
            title="处理说明"
            styles={{ body: { padding: 16 } }}
          >
            <ul className="photo-edit-tips">
              <li>视频上传后会在本地 Mac 上使用 ffmpeg 处理。</li>
              <li>系统会自动生成高质量缩略视频（最多30秒，最大1920x1080）。</li>
              <li>原视频和缩略视频都会上传到 OSS 存储。</li>
              <li>处理时间取决于视频大小，请耐心等待。</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

