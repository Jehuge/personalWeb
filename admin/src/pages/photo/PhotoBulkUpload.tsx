import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Upload,
  Typography,
  Button,
  message,
  Space,
  Row,
  Col,
  Input,
  Select,
  Switch,
  DatePicker,
  Tag,
  Progress,
  Empty,
  Tooltip,
} from 'antd'
import {
  InboxOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import PageHeader from '../../components/PageHeader'
import api from '../../utils/api'
import { extractErrorMessage } from '../../utils/error'

const { Dragger } = Upload
const { Title, Text } = Typography
const { TextArea } = Input

type UploadStatus = 'pending' | 'analyzing' | 'ready' | 'submitting' | 'success' | 'error'

type BulkUploadForm = {
  title: string
  description?: string
  category_id?: number
  is_featured: boolean
  shoot_time: Dayjs | null
}

type BulkUploadItem = {
  uid: string
  name: string
  file: File
  previewUrl: string
  status: UploadStatus
  progress: number
  error?: string
  width?: number
  height?: number
  file_size?: number
  exif?: Record<string, any> | null
  exifSummary?: Record<string, string | undefined> | null
  form: BulkUploadForm
}

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return '——'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

export default function PhotoBulkUpload() {
  const navigate = useNavigate()
  const [items, setItems] = useState<BulkUploadItem[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const itemsRef = useRef<BulkUploadItem[]>([])

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    return () => {
      itemsRef.current.forEach((item) => {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
    }
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await api.get('/photos/categories')
      setCategories(response.data)
    } catch (error) {
      message.error(extractErrorMessage(error, '获取分类失败'))
    }
  }

  const updateItem = (uid: string, updater: (prev: BulkUploadItem) => BulkUploadItem) => {
    setItems((prev) => prev.map((item) => (item.uid === uid ? updater(item) : item)))
  }

  const removeItem = (uid: string) => {
    setItems((prev) => {
      const target = prev.find((item) => item.uid === uid)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((item) => item.uid !== uid)
    })
  }

  const clearItems = () => {
    items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
    })
    setItems([])
  }

  const createExifSummary = (payload: any) => {
    if (!payload) return null
    const summary = {
      make: payload.make,
      model: payload.model,
      focal_length: payload.focal_length,
      aperture: payload.aperture,
      shutter_speed: payload.shutter_speed,
      iso: payload.iso ? String(payload.iso) : undefined,
      shoot_time: payload.shoot_time,
    }
    const hasValue = Object.values(summary).some(Boolean)
    return hasValue ? summary : null
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

  const normalizeShootTime = (value: Dayjs | null) => {
    if (!value) return undefined
    if (typeof value.toISOString === 'function') {
      return value.toISOString()
    }
    return value as unknown as string
  }

  const analyzeFile = async (file: File, uid: string) => {
    updateItem(uid, (item) => ({
      ...item,
      status: 'analyzing',
      error: undefined,
      progress: 15,
    }))

    const formData = new FormData()
    formData.append('file', file)
    try {
      const response = await api.post('/upload/image/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const data = response.data
      updateItem(uid, (item) => ({
        ...item,
        status: 'ready',
        progress: 100,
        width: data.width,
        height: data.height,
        file_size: data.file_size,
        exif: data.exif || null,
        exifSummary: createExifSummary(data),
        form: {
          ...item.form,
          title: item.form.title || data.original_name || item.name.replace(/\.[^.]+$/, ''),
          shoot_time: data.shoot_time ? dayjs(data.shoot_time) : item.form.shoot_time,
        },
      }))
      message.success(`${file.name} 解析成功`)
    } catch (error: any) {
      updateItem(uid, (item) => ({
        ...item,
        status: 'error',
        progress: 0,
        error: extractErrorMessage(error, '解析失败，请重试'),
      }))
      message.error(extractErrorMessage(error, `${file.name} 解析失败`))
    }
  }

  const handleFieldChange = (uid: string, patch: Partial<BulkUploadForm>) => {
    updateItem(uid, (item) => ({
      ...item,
      form: {
        ...item.form,
        ...patch,
      },
    }))
  }

  const uploadProps: UploadProps = {
    multiple: true,
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: (file) => {
      const uid = file.uid || `${file.name}-${Date.now()}`
      const previewUrl = URL.createObjectURL(file)
      const newItem: BulkUploadItem = {
        uid,
        name: file.name,
        file,
        previewUrl,
        status: 'pending',
        progress: 0,
        form: {
          title: file.name.replace(/\.[^.]+$/, ''),
          description: '',
          category_id: undefined,
          is_featured: false,
          shoot_time: null,
        },
        exif: null,
        exifSummary: null,
      }
      setItems((prev) => [newItem, ...prev])
      analyzeFile(file, uid)
      return false
    },
  }

  const readyItems = useMemo(
    () => items.filter((item) => item.status === 'ready' && item.form.title.trim()),
    [items],
  )

  const handleSubmit = async () => {
    if (!readyItems.length) {
      message.warning('请先上传并填写至少一张照片的信息')
      return
    }

    setSubmitting(true)
    try {
      let successCount = 0
      let failCount = 0

      for (const item of readyItems) {
        updateItem(item.uid, (prev) => ({ ...prev, status: 'submitting', error: undefined }))
        const formData = new FormData()
        appendFormField(formData, 'title', item.form.title)
        appendFormField(formData, 'description', item.form.description)
        appendFormField(formData, 'category_id', item.form.category_id)
        appendFormField(formData, 'is_featured', item.form.is_featured)
        appendFormField(formData, 'shoot_time', normalizeShootTime(item.form.shoot_time))
        appendFormField(formData, 'make', item.exifSummary?.make)
        appendFormField(formData, 'model', item.exifSummary?.model)
        appendFormField(formData, 'focal_length', item.exifSummary?.focal_length)
        appendFormField(formData, 'aperture', item.exifSummary?.aperture)
        appendFormField(formData, 'shutter_speed', item.exifSummary?.shutter_speed)
        appendFormField(formData, 'iso', item.exifSummary?.iso)
        appendFormField(formData, 'exif', item.exif ? JSON.stringify(item.exif) : undefined)
        formData.append('file', item.file)

        try {
          await api.post('/photos/with-file', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          successCount += 1
          updateItem(item.uid, (prev) => ({ ...prev, status: 'success' }))
        } catch (err: any) {
          failCount += 1
          updateItem(item.uid, (prev) => ({
            ...prev,
            status: 'error',
            error: extractErrorMessage(err, '创建失败'),
          }))
        }
      }

      if (successCount && !failCount) {
        message.success(`批量上传成功，共创建 ${successCount} 张照片`)
        navigate('/photos')
      } else if (successCount && failCount) {
        message.warning(`部分成功：${successCount} 张创建成功，${failCount} 张失败`)
      } else {
        message.error('所有照片创建都失败了，请检查后重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const renderStatusTag = (item: BulkUploadItem) => {
    switch (item.status) {
      case 'ready':
        return <Tag color="success">解析完成</Tag>
      case 'analyzing':
        return (
          <Tag color="processing">
            解析中 {item.progress ? `${item.progress}%` : ''}
          </Tag>
        )
      case 'submitting':
        return <Tag color="processing">提交中</Tag>
      case 'success':
        return <Tag color="blue">已创建</Tag>
      case 'error':
        return <Tag color="error">失败</Tag>
      default:
        return <Tag>待解析</Tag>
    }
  }

  const totalSize = useMemo(() => {
    const bytes = readyItems.reduce((sum, item) => sum + (item.file?.size || 0), 0)
    if (!bytes) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }, [readyItems])

  return (
    <div className="photo-edit-shell">
      <PageHeader
        title="批量上传照片"
        description="一次性上传多张图片，自动解析拍摄参数并在提交前统一补充文案信息。"
        stats={[
          { label: '待处理', value: items.length },
          { label: '可提交', value: readyItems.length },
          { label: '合计体积', value: totalSize },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/photos')}>
              返回列表
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchCategories}>
              刷新分类
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={clearItems} disabled={!items.length}>
              清空
            </Button>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSubmit}
              disabled={!readyItems.length}
              loading={submitting}
            >
              提交全部
            </Button>
          </Space>
        }
      />

      <Card className="bulk-upload-dropzone">
        <Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽图片到这里，支持一次选择多张</p>
          <p className="ant-upload-hint">推荐上传高清 JPG/PNG/WebP，系统会自动生成缩略图并解析 EXIF 数据</p>
        </Dragger>
      </Card>

      {!items.length ? (
        <Card className="bulk-upload-empty">
          <Empty description="还没有上传的图片" />
        </Card>
      ) : (
        <div className="bulk-upload-list">
          {items.map((item, index) => (
            <Card
              key={item.uid}
              className="bulk-upload-card"
              title={
                <Space direction="vertical" size={2}>
                  <Title level={5} style={{ margin: 0 }}>
                    #{items.length - index} {item.form.title || item.name}
                  </Title>
                  <Text type="secondary">{item.name}</Text>
                </Space>
              }
              extra={
                <Space>
                  {renderStatusTag(item)}
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={() => removeItem(item.uid)}
                  />
                </Space>
              }
            >
              {item.status === 'analyzing' && (
                <Progress percent={item.progress} size="small" status="active" />
              )}
              {item.status === 'error' && (
                <div className="bulk-upload-error">
                  <Text type="danger">{item.error}</Text>
                  <Button size="small" type="link" onClick={() => removeItem(item.uid)}>
                    删除后重新上传
                  </Button>
                </div>
              )}
              <Row gutter={24}>
                <Col xs={24} md={8}>
                  <div className="bulk-upload-preview">
                    {item.previewUrl ? (
                      <img src={item.previewUrl} alt={item.form.title} />
                    ) : (
                      <div className="bulk-upload-preview__placeholder">等待解析...</div>
                    )}
                  </div>
                  <div className="bulk-upload-meta">
                    <div>
                      <span>尺寸</span>
                      <span>
                        {item.width && item.height ? `${item.width} × ${item.height}` : '解析后显示'}
                      </span>
                    </div>
                    <div>
                      <span>大小</span>
                      <span>{formatFileSize(item.file.size || item.file_size)}</span>
                    </div>
                    {item.exifSummary && (
                      <>
                        <div>
                          <span>相机</span>
                          <span>
                            {[item.exifSummary.make, item.exifSummary.model].filter(Boolean).join(' ') ||
                              '--'}
                          </span>
                        </div>
                        <div>
                          <span>光圈</span>
                          <span>{item.exifSummary.aperture || '--'}</span>
                        </div>
                        <div>
                          <span>快门</span>
                          <span>{item.exifSummary.shutter_speed || '--'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </Col>
                <Col xs={24} md={16}>
                  <Row gutter={16}>
                    <Col span={24}>
                      <label className="bulk-upload-field-label">标题</label>
                      <Input
                        placeholder="请输入标题"
                        value={item.form.title}
                        onChange={(e) => handleFieldChange(item.uid, { title: e.target.value })}
                      />
                    </Col>
                    <Col span={24}>
                      <label className="bulk-upload-field-label">描述</label>
                      <TextArea
                        rows={3}
                        placeholder="（可选）补充拍摄故事、地点等信息"
                        value={item.form.description}
                        onChange={(e) =>
                          handleFieldChange(item.uid, { description: e.target.value })
                        }
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <label className="bulk-upload-field-label">分类</label>
                      <Select
                        placeholder="选择分类"
                        value={item.form.category_id}
                        allowClear
                        onChange={(value) => handleFieldChange(item.uid, { category_id: value })}
                        options={categories.map((cat) => ({ label: cat.name, value: cat.id }))}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <label className="bulk-upload-field-label">
                        <Space size={4}>
                          精选展示
                          <Tooltip title="开启后，素材将优先展示在首页精选区域">
                            <Text type="secondary">?</Text>
                          </Tooltip>
                        </Space>
                      </label>
                      <Switch
                        checked={item.form.is_featured}
                        checkedChildren="精选"
                        unCheckedChildren="普通"
                        onChange={(checked) =>
                          handleFieldChange(item.uid, { is_featured: checked })
                        }
                      />
                    </Col>
                    <Col span={24}>
                      <label className="bulk-upload-field-label">拍摄时间</label>
                      <DatePicker
                        style={{ width: '100%' }}
                        showTime
                        allowClear
                        value={item.form.shoot_time}
                        onChange={(value) => handleFieldChange(item.uid, { shoot_time: value })}
                      />
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


