import type { ReactNode } from 'react'
import { Typography } from 'antd'

const { Title, Text } = Typography

interface PageHeaderStat {
  label: string
  value: ReactNode
  hint?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  extra?: ReactNode
  stats?: PageHeaderStat[]
}

export default function PageHeader({ title, description, extra, stats }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div className="page-header__top">
        <div>
          <Title level={3} style={{ marginBottom: 4 }}>
            {title}
          </Title>
          {description && (
            <Text type="secondary" style={{ display: 'block' }}>
              {description}
            </Text>
          )}
        </div>
        {extra && <div className="page-header__extra">{extra}</div>}
      </div>
      {stats && stats.length > 0 && (
        <div className="page-header__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="page-header__stat">
              <span className="page-header__stat-label">{stat.label}</span>
              <span className="page-header__stat-value">{stat.value}</span>
              {stat.hint && <span className="page-header__stat-hint">{stat.hint}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


