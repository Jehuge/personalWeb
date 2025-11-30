import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, message, Typography, Space } from 'antd'
import { UserOutlined, LockOutlined, ReloadOutlined, SafetyOutlined } from '@ant-design/icons'
import { useAuthStore } from '../store/authStore'

const { Text, Title } = Typography

const generateCaptcha = () =>
  Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [captcha, setCaptcha] = useState(generateCaptcha())

  const refreshCaptcha = () => setCaptcha(generateCaptcha())

  const onFinish = async (values: { username: string; password: string; captcha: string }) => {
    if (values.captcha?.toUpperCase() !== captcha) {
      message.error('验证码不正确，请重试')
      refreshCaptcha()
      return
    }

    setLoading(true)
    try {
      await login(values.username, values.password)
      message.success('登录成功')
      navigate('/')
    } catch (error: any) {
      message.error(error.response?.data?.detail || '登录失败，请检查用户名和密码')
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-panel__inner">
          <div className="login-panel__hero">
            <Text type="secondary">PERSONAL WEB ADMIN</Text>
            <h1>让内容管理体验更优雅</h1>
            <p>
              新的后台界面覆盖博客、摄影、AI 项目的全链路管理体验。通过更清晰的视觉层级与交互设计，
              帮助你在忙碌的创作中也能保持高效、有序。
            </p>
            <Space direction="vertical" size={4}>
              <Text strong>• 统一操作入口</Text>
              <Text strong>• 强化筛选和面板反馈</Text>
              <Text strong>• 内置安全验证码</Text>
            </Space>
          </div>
          <div className="login-panel__body">
            <div style={{ marginBottom: 32 }}>
              <Title level={3} style={{ marginBottom: 8 }}>
                欢迎回来
              </Title>
              <Text type="secondary">请使用管理账号登录后台</Text>
            </div>
            <Form
              name="login"
              onFinish={onFinish}
              autoComplete="off"
              size="large"
              layout="vertical"
            >
              <Form.Item
                name="username"
                label="用户名 / 邮箱"
                rules={[{ required: true, message: '请输入用户名或邮箱' }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="例如：admin"
                  allowClear
                />
              </Form.Item>
              <Form.Item
                name="password"
                label="密码"
                rules={[{ required: true, message: '请输入密码' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入密码"
                />
              </Form.Item>
              <Form.Item
                name="captcha"
                label={
                  <Space>
                    <SafetyOutlined />
                    <span>验证码</span>
                  </Space>
                }
                rules={[{ required: true, message: '请输入验证码' }]}
              >
                <div className="captcha-box">
                  <Input
                    placeholder="输入右侧验证码"
                    maxLength={6}
                  />
                  <div className="captcha-code">{captcha}</div>
                  <Button
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={refreshCaptcha}
                  >
                    换一个
                  </Button>
                </div>
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={loading}
                >
                  登录管理后台
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </div>
  )
}




