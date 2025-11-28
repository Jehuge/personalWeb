import { useEffect, useState } from 'react'
import {
  Table,
  Button,
  Space,
  Popconfirm,
  message,
  Tag,
  Switch,
} from 'antd'
import { EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import api from '../../utils/api'
import dayjs from 'dayjs'

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

  const handleToggleActive = async (user: User) => {
    try {
      // 需要后端支持
      message.warning('用户状态更新功能需要后端支持')
      // await api.put(`/users/${user.id}`, { is_active: !user.is_active })
      // message.success('更新成功')
      // fetchUsers()
    } catch (error) {
      message.error('更新失败')
    }
  }

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
      render: (active, record) => (
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
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => message.info('编辑用户功能需要后端支持')}
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: '#999' }}>
          提示：用户管理功能需要后端提供相应的API接口支持
        </p>
      </div>
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={loading}
      />
    </div>
  )
}

