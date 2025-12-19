# 反爬虫措施说明文档

## 概述

本项目已实现多层反爬虫保护机制，包括速率限制、User-Agent检查等功能，有效防止恶意爬虫和过度请求。

## 已实现的反爬措施

### 1. 速率限制 (Rate Limiting)

使用 `slowapi` 库实现基于IP的速率限制：

- **默认限制**：
  - 每分钟：60次请求
  - 每小时：1000次请求
  
- **应用范围**：
  - 首页概览接口 (`/api/home/overview`)
  - 随机图片接口 (`/api/home/random-photos`)
  - 博客列表接口 (`/api/blogs`)
  - 博客详情接口 (`/api/blogs/{id}`)
  - 照片列表接口 (`/api/photos`)
  - 照片详情接口 (`/api/photos/{id}`)

- **超出限制响应**：
  - HTTP 429 (Too Many Requests)
  - 响应头包含 `Retry-After` 提示重试时间

### 2. User-Agent 检查

自动检测并阻止可疑的爬虫User-Agent：

- **检测规则**：
  - 识别常见的爬虫标识（bot、crawler、spider等）
  - 检测无User-Agent的请求（可配置）
  - 支持正则表达式匹配

- **白名单机制**：
  - 允许主流搜索引擎爬虫（Googlebot、Bingbot、Baiduspider等）
  - 允许社交媒体爬虫（Facebook、Twitter、LinkedIn等）

- **被阻止响应**：
  - HTTP 403 (Forbidden)
  - 错误信息：`Access denied: Crawler detected`

### 3. 查询参数限制

所有列表接口都有严格的参数限制：

- `limit` 参数：最大值为100-200（根据接口不同）
- `skip` 参数：必须 >= 0
- 防止通过大量请求获取所有数据

### 4. JWT 认证

需要登录的接口都使用JWT认证：

- 防止未授权访问
- Token过期时间：30分钟（可配置）

### 5. CORS 配置

限制跨域请求来源：

- 仅允许配置的域名访问
- 默认仅允许本地开发端口

## 配置说明

在 `.env` 文件中可以配置以下参数：

```env
# 是否启用速率限制
ENABLE_RATE_LIMIT=true

# 速率限制配置
RATE_LIMIT_PER_MINUTE=60    # 每分钟请求数
RATE_LIMIT_PER_HOUR=1000    # 每小时请求数

# 是否启用User-Agent检查
ENABLE_USER_AGENT_CHECK=true

# 是否允许空的User-Agent
ALLOW_EMPTY_USER_AGENT=false
```

## 使用示例

### 为API端点添加速率限制

```python
from fastapi import Request
from app.core.anti_crawler import limiter
from app.core.config import settings

@router.get("/your-endpoint")
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def your_endpoint(request: Request):
    # 注意：必须添加 request: Request 参数
    return {"message": "success"}
```

### 自定义速率限制

```python
# 每分钟10次
@limiter.limit("10/minute")
async def endpoint(request: Request):
    pass

# 每小时100次
@limiter.limit("100/hour")
async def endpoint(request: Request):
    pass
```

## 注意事项

1. **速率限制基于IP地址**：
   - 使用 `X-Forwarded-For` 头获取真实IP（如果使用反向代理）
   - 如果无法获取IP，会使用User-Agent作为备选

2. **User-Agent检查**：
   - 搜索引擎爬虫在白名单中，不会被阻止
   - 空的User-Agent默认会被阻止（可通过配置允许）

3. **性能影响**：
   - 速率限制使用内存存储，重启后重置
   - 对于高并发场景，建议使用Redis等外部存储

4. **开发环境**：
   - 可以通过设置 `ENABLE_RATE_LIMIT=false` 临时禁用速率限制
   - 可以通过设置 `ENABLE_USER_AGENT_CHECK=false` 临时禁用User-Agent检查

## 未来改进建议

1. **Redis支持**：
   - 使用Redis存储速率限制数据，支持分布式部署
   - 实现更精确的速率限制统计

2. **IP白名单/黑名单**：
   - 支持配置IP白名单（完全放行）
   - 支持配置IP黑名单（永久封禁）

3. **验证码集成**：
   - 为前端拼图验证码添加后端验证
   - 在检测到异常请求时要求验证码

4. **请求日志**：
   - 记录所有被阻止的请求
   - 分析异常请求模式

5. **动态调整**：
   - 根据请求模式动态调整速率限制
   - 自动识别并封禁恶意IP

## 测试反爬措施

### 测试速率限制

```bash
# 快速发送多个请求
for i in {1..100}; do
  curl http://localhost:8000/api/home/overview
done
```

### 测试User-Agent检查

```bash
# 使用爬虫User-Agent
curl -H "User-Agent: python-requests/2.28.1" http://localhost:8000/api/home/overview

# 无User-Agent
curl -H "User-Agent: " http://localhost:8000/api/home/overview
```

## 相关文件

- `app/core/anti_crawler.py` - 反爬虫核心逻辑
- `app/main.py` - 中间件注册
- `app/core/config.py` - 配置项定义
- `requirements.txt` - 依赖包（包含slowapi）

