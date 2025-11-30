import { useEffect, useMemo, useState } from 'react'
import {
  Table,
  Button,
  message,
  Tag,
  Card,
  Space,
} from 'antd'
import { EditOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import api from '../../utils/api'
import PageHeader from '../../components/PageHeader'

interface User {
  id: number
  username: string
  email: string
  is_active: boolean
  is_superuser: boolean
  created_at: string
}

export default function UserList() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await api.get('/users')
      setUsers(response.data)
    } catch (error: any) {
      if (error.response?.status === 403) {
        message.error('权限不足，只有超级管理员可以查看用户列表')
      } else {
        message.error('获取用户列表失败')
      }
    } finally {
      setLoading(false)
    }
  }

  const activeCount = useMemo(() => users.filter((user) => user.is_active).length, [users])
  const adminCount = useMemo(() => users.filter((user) => user.is_superuser).length, [users])

  const columns: ColumnsType<User> = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 80,
    },
    {
      title: '用户名',
      dataIndex: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
    },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 100,
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? '激活' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '角色',
      dataIndex: 'is_superuser',
      width: 100,
      render: (superuser) => (
        <Tag color={superuser ? 'gold' : 'default'}>
          {superuser ? '超级管理员' : '普通用户'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 180,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      width: 150,
      fixed: 'right',
      className: 'table-col-actions',
      render: () => (
        <div className="table-actions">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => message.info('编辑用户功能需要后端支持')}
          >
            编辑
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="page-shell">
      <PageHeader
        title="用户管理"
        description="查看后台可用账户及其角色，后续可扩展状态切换、重置密码等高级功能。"
        stats={[
          { label: '用户总数', value: users.length },
          { label: '活跃', value: activeCount },
          { label: '超级管理员', value: adminCount },
        ]}
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchUsers}>
            刷新
          </Button>
        }
      />
      <Card
        className="app-card"
        title={
          <Space>
            <InfoCircleOutlined />
            <span>温馨提示</span>
          </Space>
        }
        style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
      >
        用户状态切换、权限分配等操作需要后端接口支持，当前版本仅提供可视化查看。
      </Card>
      <Card className="app-card" style={{ marginTop: -12 }}>
        <Table
          className="app-table"
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
        />
      </Card>
    </div>
  )
}

