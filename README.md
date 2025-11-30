# 个人综合展示网站（Personal Web）

基于 FastAPI + React/Vite 的三端分离个人综合展示平台，面向独立开发者、摄影师与创作者，集博客、摄影作品、AI 实验展示于一体，兼顾技术实力与视觉呈现。当前仓库已实现后端 API、管理端、数据库脚手架与 OSS 工具链，可作为个人品牌官网的核心基础。

## 核心特性

- **FastAPI 服务端**：`app/api` 模块化路由覆盖认证、博客、摄影、媒体、AI 项目、文件上传与用户管理，内置 JWT、CORS、健康检查等基础设施。
- **React 管理后台**：`admin/` 基于 Vite + Ant Design + Zustand，提供内容维护、分类标签管理、媒体库与 AI 项目编排能力。
- **多媒体能力**：`app/utils/oss.py` 集成阿里云 OSS，支持多级路径上传、WebP 缩略图生成、资源删除与 CDN 域名适配。
- **数据模型完善**：`app/models/` 定义用户、博客、照片、AI 项目等实体；`sql/` 提供初始化脚本与快速体验脚本（详见 `MYSQL_SETUP.md`、`CATEGORY_SYSTEM.md`、`OSS_CONFIG.md`）。
- **三端分层**：后端 API、管理端、（待接入的）对外展示站点 `Web/` 互相解耦，满足独立部署与权限隔离需求。

## 系统架构

```
┌─────────────┐   REST API   ┌──────────────┐
│ Web 前台    │ <──────────> │ FastAPI 核心 │
│ (进行中)    │              │ app/main.py  │
└─────────────┘              └──────────────┘
         ↑                           ↑
         │                           │
┌─────────────┐   私有 API   ┌──────────────┐
│ Admin 管理端│ <──────────> │ DB/OSS 层     │
│ Vite + Antd │              │ MySQL + OSS  │
└─────────────┘              └──────────────┘
```

- **配置层**：`app/core/config.py` 通过 `pydantic-settings` 管理环境变量，统一注入数据库、JWT、OSS 与 CORS 配置。
- **数据访问层**：`app/core/database.py` 建立 SQLAlchemy 异步会话；`app/models/*` 描述实体；`app/schemas/*` 暴露 Pydantic DTO。
- **安全层**：`app/core/security.py` 提供密码哈希与 JWT 令牌；`app/api/dependencies.py` 控制角色、权限。

## 目录速览

```
app/
  core/         # 配置、数据库、初始化、安全模块
  api/          # FastAPI 路由（auth/blog/photo/ai/media/upload/user）
  models/       # SQLAlchemy 数据模型
  schemas/      # Pydantic 模型
  utils/oss.py  # OSS 上传、缩略图、删除工具
admin/          # Vite + React 管理后台
sql/            # 初始化与快速体验 SQL
start_backend.sh / start_admin.sh  # 快速启动脚本
CATEGORY_SYSTEM.md / MYSQL_SETUP.md / OSS_CONFIG.md  # 配置说明
```

## 快速开始

### 前置依赖

- Python 3.11+
- Node.js 18+ / npm
- 本地或云端 MySQL 8（可参考 `MYSQL_SETUP.md`）
- 已配置的 OSS 账号（参考 `OSS_CONFIG.md`）

### 后端（FastAPI）

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # 自行创建并按下文填写
python3 start_backend.sh
```

主要端点：

- `GET /` 根路由信息
- `GET /health` 健康检查
- `POST /api/auth/login` 登录获取 JWT
- `POST /api/upload/*` 媒体上传（依赖 OSS 配置）
- `GET/POST/PUT/DELETE /api/blog|photo|ai_project|user/...` 内容管理

### 管理后台（React + Vite）

```bash
cd admin
npm install
npm run dev
```

默认开发地址 `http://localhost:5173`，通过 `admin/src/utils/api.ts` 统一配置 API 基址与认证拦截器，结合 `store/authStore.ts` 管理登录态。

### Web 前台（炫酷双主题展示站）

```bash
cd Web
npm install
npm run dev
```

- 默认开发地址 `http://localhost:3000`，生产预览 `npm run preview`。
- 在 `Web/.env`（或 `.env.local`）中设置 `VITE_API_BASE_URL=http://localhost:8000` 指向 FastAPI。
- Web 端自带黑夜/白天模式切换、Hero 动画、AI 项目/博客/摄影聚合与时间线展示，会优先请求实时数据，失败时自动降级为示例内容。

## 环境变量

在项目根目录创建 `.env`（可参考 `.env.example`）：

```
APP_NAME=个人网站
APP_VERSION=1.0.0
DATABASE_URL=mysql+asyncmy://root:password@localhost:3306/personal_web
SECRET_KEY=替换为32位以上随机串
ACCESS_TOKEN_EXPIRE_MINUTES=30
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=your-bucket
OSS_BASE_URL=https://cdn.yourdomain.com
CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"]
```

> `OSS_BASE_URL` 可配置自定义 CDN 域名，`OSSService.extract_oss_path` 会自动解析。

## 数据库与初始化

- 运行 `sql/init.sql` 建表，可配合 `sql/quick_start.sql` 导入示例数据。
- `app/core/init_db.py` 提供基础管理员账户与分类初始化逻辑。
- 分类体系、标签策略详见 `CATEGORY_SYSTEM.md`，MySQL 安装与权限配置参见 `MYSQL_SETUP.md`。

## OSS 与多媒体

- `setup_oss.sh` 帮助校验 SDK、Bucket、CNAME 等配置。
- `OSSService.upload_image` 默认生成压缩图与 WebP 缩略图，并保持多级目录结构（如 `media/2025/11/file.jpg`）。
- 删除媒体时调用 `OSSService.delete_file`，确保垃圾文件清理。

## 安全与权限

- JWT 登录 / 刷新策略：`app/api/auth.py` + `app/core/security.py`。
- 角色字段：`User.is_superuser` 控制后台特权；`dependencies.get_current_admin_user` 保证 admin-only 操作。
- CORS 白名单可通过环境变量配置，默认开放本地前端端口。

## 开发流程与脚本

- `start_backend.sh`：检测 `.env` 后启动 `uvicorn app.main:app --reload`。
- `start_admin.sh`：进入 `admin/` 并运行 `npm run dev`。
- `setup_oss.sh`：交互式检查 OSS Key、Bucket、网络连通性。

## 生产环境部署

### 宝塔面板部署（推荐）

详细的宝塔面板部署指南请参考：[**DEPLOY_BT.md**](./DEPLOY_BT.md)

快速部署步骤：
1. 上传项目到服务器 `/www/wwwroot/personal-web/`
2. 创建数据库并导入 `sql/init.sql`
3. 配置 `.env` 文件（参考 `deploy/.env.example`）
4. 运行部署脚本：`bash deploy/deploy.sh`
5. 配置Nginx反向代理（参考 `deploy/nginx.conf.example`）
6. 配置SSL证书启用HTTPS

### 部署文件说明

- `DEPLOY_BT.md` - 完整的宝塔面板部署指南
- `deploy/nginx.conf.example` - Nginx配置示例
- `deploy/pm2.config.js` - PM2进程管理配置
- `deploy/deploy.sh` - 一键部署脚本
- `deploy/.env.example` - 环境变量配置示例

## 后续规划

- Web 前台（`Web/`）对接 API，实现访客端博客、作品集、AI 实验室展示与深浅色主题切换。
- 接入自动化测试与 CI/CD，完善 `docs/` 与 API 文档导出。
- 根据 `OSS_CONFIG.md` 优化多地域加速、生命周期策略与成本监控。

> 欢迎根据自身品牌定位扩展页面风格、动画与互动体验，在确保安全与性能的同时展示个人技术与艺术创作力。


