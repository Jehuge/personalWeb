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
  Switch,
  Tag,
  Progress,
  Empty,
} from 'antd'
import {
  InboxOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import type { UploadProps } from 'antd'
import PageHeader from '../../components/PageHeader'
import api from '../../utils/api'
import { extractErrorMessage } from '../../utils/error'

const { Dragger } = Upload
const { Title, Text } = Typography
const { TextArea } = Input

type UploadStatus = 'pending' | 'analyzing' | 'ready' | 'submitting' | 'success' | 'error'

type BulkUploadForm = {
  title: string
  prompt?: string
  negative_prompt?: string
  model_name?: string
  category?: string
  tags?: string
  parameters?: string
  is_featured: boolean
  is_published: boolean
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
  form: BulkUploadForm
}

const formatFileSize = (size?: number | null) => {
  if (!size || size <= 0) return '——'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

export default function AIImageBulkUpload() {
  const navigate = useNavigate()
  const [items, setItems] = useState<BulkUploadItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const itemsRef = useRef<BulkUploadItem[]>([])

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
        status: 'ready',
        progress: 100,
        form: {
          title: file.name.replace(/\.[^.]+$/, ''),
          prompt: '',
          negative_prompt: '',
          model_name: '',
          category: '',
          tags: '',
          parameters: '',
          is_featured: false,
          is_published: true,
        },
      }
      setItems((prev) => [newItem, ...prev])
      return false
    },
  }

  const readyItems = useMemo(
    () => items.filter((item) => item.status === 'ready' && item.form.title.trim()),
    [items],
  )

  const handleSubmit = async () => {
    if (!readyItems.length) {
      message.warning('请先上传并填写至少一张图片的信息')
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
        appendFormField(formData, 'prompt', item.form.prompt)
        appendFormField(formData, 'negative_prompt', item.form.negative_prompt)
        appendFormField(formData, 'model_name', item.form.model_name)
        appendFormField(formData, 'category', item.form.category)
        appendFormField(formData, 'tags', item.form.tags)
        appendFormField(formData, 'parameters', item.form.parameters)
        appendFormField(formData, 'is_featured', item.form.is_featured)
        appendFormField(formData, 'is_published', item.form.is_published)
        formData.append('file', item.file)

        try {
          await api.post('/ai-images/with-file', formData, {
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
        message.success(`批量上传成功，共创建 ${successCount} 张图片`)
        navigate('/ai-images')
      } else if (successCount && failCount) {
        message.warning(`部分成功：${successCount} 张创建成功，${failCount} 张失败`)
      } else {
        message.error('所有图片创建都失败了，请检查后重试')
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
        title="批量上传 AI 图片"
        description="一次性上传多张AI生成的图片，统一补充生成参数和标签信息。"
        stats={[
          { label: '待处理', value: items.length },
          { label: '可提交', value: readyItems.length },
          { label: '合计体积', value: totalSize },
        ]}
        extra={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/ai-images')}>
              返回列表
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
          <p className="ant-upload-hint">推荐上传高清 JPG/PNG/WebP，系统会自动生成缩略图</p>
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
                      <label className="bulk-upload-field-label">分类</label>
                      <Input
                        placeholder="例如：Stable Diffusion / Midjourney"
                        value={item.form.category}
                        onChange={(e) => handleFieldChange(item.uid, { category: e.target.value })}
                      />
                    </Col>
                    <Col span={24}>
                      <label className="bulk-upload-field-label">标签</label>
                      <Input
                        placeholder="用逗号分隔，例如：portrait, cyberpunk, 8k"
                        value={item.form.tags}
                        onChange={(e) => handleFieldChange(item.uid, { tags: e.target.value })}
                      />
                    </Col>
                    <Col span={24}>
                      <label className="bulk-upload-field-label">模型名称</label>
                      <Input
                        placeholder="例如：sd_xl_base_1.0.safetensors"
                        value={item.form.model_name}
                        onChange={(e) => handleFieldChange(item.uid, { model_name: e.target.value })}
                      />
                    </Col>
                    <Col span={24}>
                      <label className="bulk-upload-field-label">正向提示词 (Prompt)</label>
                      <TextArea
                        rows={3}
                        placeholder="描述想要生成的画面..."
                        value={item.form.prompt}
                        onChange={(e) => handleFieldChange(item.uid, { prompt: e.target.value })}
                      />
                    </Col>
                    <Col span={24}>
                      <label className="bulk-upload-field-label">反向提示词 (Negative Prompt)</label>
                      <TextArea
                        rows={2}
                        placeholder="描述不想要出现的元素..."
                        value={item.form.negative_prompt}
                        onChange={(e) =>
                          handleFieldChange(item.uid, { negative_prompt: e.target.value })
                        }
                      />
                    </Col>
                    <Col span={24}>
                      <label className="bulk-upload-field-label">生成参数 (JSON)</label>
                      <TextArea
                        rows={3}
                        placeholder='例如：{"steps": 20, "sampler": "Euler a", "cfg_scale": 7}'
                        value={item.form.parameters}
                        onChange={(e) => handleFieldChange(item.uid, { parameters: e.target.value })}
                        style={{ fontFamily: 'monospace' }}
                      />
                    </Col>
                    <Col xs={24} md={12}>
                      <label className="bulk-upload-field-label">
                        <Space size={4}>
                          精选展示
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
                    <Col xs={24} md={12}>
                      <label className="bulk-upload-field-label">
                        <Space size={4}>
                          发布状态
                        </Space>
                      </label>
                      <Switch
                        checked={item.form.is_published}
                        checkedChildren="已发布"
                        unCheckedChildren="草稿"
                        onChange={(checked) =>
                          handleFieldChange(item.uid, { is_published: checked })
                        }
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

