# 宝塔面板部署指南

本指南将帮助您在阿里云服务器（宝塔面板）上部署个人综合展示网站项目。

## 📋 部署架构

```
┌─────────────────┐
│   Nginx (80/443) │
└────────┬─────────┘
         │
    ┌────┴────┬──────────────┬─────────────┐
    │         │              │             │
┌───▼───┐ ┌──▼───┐    ┌─────▼────┐  ┌────▼────┐
│ Web   │ │Admin │    │ FastAPI  │  │  MySQL  │
│前台   │ │管理端 │    │ 后端API  │  │  数据库  │
│:3001  │ │:3000 │    │  :8000   │  │  :3306  │
└───────┘ └──────┘    └──────────┘  └─────────┘
```

## 🚀 部署步骤

### 一、服务器环境准备

#### 1.1 登录宝塔面板

- 访问 `http://你的服务器IP:8888`
- 使用宝塔面板账号登录

#### 1.2 安装必要软件

在宝塔面板的「软件商店」中安装：

- **Nginx** (推荐 1.22+)
- **MySQL** (推荐 8.0+)
- **Python项目管理器** 或 **PM2管理器**
- **Node.js版本管理器** (推荐 Node.js 18+)
- **Git** (如果使用Git方式上传项目)

**安装Git（如果未安装）：**

方式一：通过宝塔面板安装
1. 在宝塔面板「软件商店」搜索「Git」
2. 点击「安装」

方式二：通过SSH命令行安装
```bash
# CentOS/RHEL
yum install -y git

# Ubuntu/Debian
apt-get update && apt-get install -y git
```

#### 1.3 创建网站目录

在宝塔面板「文件」中，创建项目目录：

```bash
/www/wwwroot/personal-web/
```

### 二、上传项目文件

#### 2.1 方式一：使用Git（推荐，需要先安装Git）

**如果遇到 "git: 未找到命令" 错误，请先安装Git（参考步骤1.2）**

```bash
cd /www/wwwroot/
git clone https://github.com/你的用户名/personalWeb.git personal-web
cd personal-web
```

或者如果目录已存在：
```bash
cd /www/wwwroot/personal-web/
git init
git remote add origin https://github.com/你的用户名/personalWeb.git
git pull origin main
```

#### 2.2 方式二：使用宝塔文件管理器（推荐，无需Git）

1. **在本地打包项目**：
   - 在项目根目录执行（排除不需要的文件）：
   ```bash
   # 在本地项目目录执行
   tar -czf personal-web.tar.gz \
     --exclude='node_modules' \
     --exclude='.venv' \
     --exclude='admin/node_modules' \
     --exclude='Web/node_modules' \
     --exclude='.git' \
     --exclude='__pycache__' \
     --exclude='*.pyc' \
     .
   ```

2. **上传到服务器**：
   - 登录宝塔面板
   - 进入「文件」管理器
   - 导航到 `/www/wwwroot/`
   - 点击「上传」，选择 `personal-web.tar.gz`
   - 上传完成后，右键点击文件选择「解压」
   - 解压后重命名文件夹为 `personal-web`（如果名称不同）

#### 2.3 方式三：使用FTP/SFTP工具

1. 使用 FileZilla、WinSCP 等工具连接服务器
2. 上传整个项目文件夹到 `/www/wwwroot/personal-web/`
3. 注意：上传后需要设置文件权限

**设置文件权限（如果使用FTP上传）：**
```bash
cd /www/wwwroot/personal-web/
chmod +x deploy/deploy.sh
chown -R www:www .  # 根据实际情况调整用户组
```

### 三、数据库配置

#### 3.1 创建数据库

1. 在宝塔面板「数据库」中点击「添加数据库」
2. 数据库名：`personal_web`
3. 用户名：`personal_web_user`（或自定义）
4. 密码：设置强密码
5. 记录数据库信息

#### 3.2 导入数据库结构

1. 在宝塔「数据库」中找到刚创建的数据库，点击「管理」
2. 进入 phpMyAdmin
3. 选择数据库，点击「导入」
4. 上传并执行 `sql/init.sql`
5. （可选）导入示例数据 `sql/quick_start.sql`

### 四、后端部署（FastAPI）

#### 4.1 检查Python版本并创建虚拟环境

**重要：项目需要Python 3.8+（推荐3.11+）**

首先检查Python版本：
```bash
python3 --version
```

**如果Python版本低于3.8，需要升级：**

**方式一：使用宝塔面板（推荐）**
1. 在宝塔面板「软件商店」搜索「Python版本管理器」
2. 安装Python 3.11或更高版本
3. 在项目设置中选择Python 3.11

**方式二：手动安装Python 3.11（CentOS）**
```bash
# 运行安装脚本
bash deploy/install-python311.sh

# 或手动安装
yum install -y python311 python311-pip
```

**方式三：使用编译安装（如果yum没有Python 3.11）**
```bash
bash deploy/install-python311.sh
```

**创建虚拟环境：**

如果使用Python 3.11：
```bash
cd /www/wwwroot/personal-web/
python3.11 -m venv .venv
source .venv/bin/activate
```

如果系统默认python3版本符合要求：
```bash
cd /www/wwwroot/personal-web/
python3 -m venv .venv
source .venv/bin/activate
```

**验证Python版本：**
```bash
python --version  # 应该显示3.8+或3.11+
```

#### 4.2 安装Python依赖

**如果使用阿里云镜像源遇到版本问题，请使用以下方案：**

**方案一：使用官方PyPI源（推荐，解决版本问题）**

```bash
# 升级pip
pip install --upgrade pip -i https://pypi.org/simple

# 使用官方源安装依赖
pip install -i https://pypi.org/simple -r requirements.txt
```

或者使用修复脚本：
```bash
bash deploy/fix-pip-source.sh
```

**方案二：使用兼容版本（如果官方源访问较慢）**

```bash
# 使用兼容版本的requirements文件
pip install -r requirements-compatible.txt
```

**方案三：临时切换pip源**

```bash
# 临时使用官方源
pip install -i https://pypi.org/simple -r requirements.txt

# 或使用清华镜像源（通常更新较快）
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt
```

**常见问题：**

如果遇到 `Could not find a version that satisfies the requirement fastapi==0.104.1`：
- **原因**：镜像源未同步最新版本
- **解决**：使用方案一（官方源）或方案二（兼容版本）

#### 4.3 配置环境变量

创建 `.env` 文件：

```bash
cd /www/wwwroot/personal-web/
nano .env
```

填入以下配置（根据实际情况修改）：

```env
APP_NAME=个人网站
APP_VERSION=1.0.0
DEBUG=False

# 数据库配置（使用步骤3.1创建的数据库信息）
DATABASE_URL=mysql+asyncmy://personal_web_user:你的数据库密码@localhost:3306/personal_web

# JWT密钥（生成随机32位以上字符串）
SECRET_KEY=你的随机密钥字符串至少32位
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OSS配置（阿里云OSS）
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=你的Bucket名称
OSS_BASE_URL=https://你的CDN域名或OSS域名

# CORS配置（允许的前端域名）
CORS_ORIGINS=["https://你的域名.com","https://admin.你的域名.com","https://www.你的域名.com"]
```

#### 4.4 使用PM2管理后端进程

**方式一：使用宝塔PM2管理器**

1. 在宝塔「软件商店」安装「PM2管理器」
2. 添加项目：
   - 项目名称：`personal-web-api`
   - 项目路径：`/www/wwwroot/personal-web/`
   - 启动文件：`app/main:app`
   - 运行目录：`/www/wwwroot/personal-web/`
   - Python版本：选择 Python 3.11+
   - 启动方式：`uvicorn`
   - 端口：`8000`

**方式二：手动使用PM2**

```bash
cd /www/wwwroot/personal-web/
source .venv/bin/activate
pm2 start uvicorn --name "personal-web-api" -- app.main:app --host 0.0.0.0 --port 8000 --workers 4
pm2 save
pm2 startup
```

**方式三：使用Gunicorn（生产环境推荐）**

```bash
cd /www/wwwroot/personal-web/
source .venv/bin/activate
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000
```

使用PM2管理Gunicorn：

```bash
pm2 start gunicorn --name "personal-web-api" -- -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 app.main:app
pm2 save
```

### 五、前端部署

#### 5.1 部署管理后台（Admin）

```bash
cd /www/wwwroot/personal-web/admin/
npm install
npm run build
```

构建完成后，文件在 `admin/dist/` 目录。

#### 5.2 部署Web前台

```bash
cd /www/wwwroot/personal-web/Web/
npm install
npm run build
```

构建完成后，文件在 `Web/dist/` 目录。

#### 5.3 配置前端环境变量（可选）

如果前端需要配置API地址，创建环境变量文件：

**admin/.env.production**

```env
VITE_API_BASE_URL=https://api.你的域名.com
```

**Web/.env.production**

```env
VITE_API_BASE_URL=https://api.你的域名.com
VITE_BACKEND_URL=https://api.你的域名.com
```

然后重新构建：

```bash
cd admin && npm run build
cd ../Web && npm run build
```

### 六、Nginx配置

#### 6.1 创建网站

在宝塔面板「网站」中：

1. 点击「添加站点」
2. 域名：`你的域名.com`（主站）
3. 根目录：`/www/wwwroot/personal-web/Web/dist`
4. PHP版本：纯静态

#### 6.2 配置Nginx反向代理

点击网站「设置」→「配置文件」，修改为：

```nginx
# 主站（Web前台）
server {
    listen 80;
    server_name 你的域名.com www.你的域名.com;
  
    # Web前台静态文件
    location / {
        root /www/wwwroot/personal-web/Web/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
  
    # API代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
      
        # WebSocket支持（如果需要）
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# 管理后台
server {
    listen 80;
    server_name admin.你的域名.com;
  
    location / {
        root /www/wwwroot/personal-web/admin/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
  
    # API代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 6.3 配置SSL证书（HTTPS）

1. 在宝塔「网站」→「设置」→「SSL」
2. 选择「Let's Encrypt」免费证书
3. 勾选「强制HTTPS」
4. 保存并重启Nginx

配置SSL后，记得更新 `.env` 中的 `CORS_ORIGINS` 为HTTPS地址。

### 七、防火墙配置

在宝塔「安全」中开放端口：

- **80**：HTTP
- **443**：HTTPS
- **8000**：后端API（仅内网访问，不需要对外开放）
- **3306**：MySQL（仅内网访问，不需要对外开放）

### 八、进程管理

#### 8.1 查看PM2进程

```bash
pm2 list
pm2 logs personal-web-api
```

#### 8.2 重启服务

```bash
pm2 restart personal-web-api
```

#### 8.3 设置开机自启

```bash
pm2 save
pm2 startup
```

### 九、验证部署

#### 9.1 检查后端API

访问：`https://你的域名.com/api/health`
应该返回：`{"status":"ok"}`

#### 9.2 检查前端

- 主站：`https://你的域名.com`
- 管理后台：`https://admin.你的域名.com`

#### 9.3 检查数据库连接

访问：`https://你的域名.com/api/`
查看是否正常返回API信息

### 十、常见问题

#### 10.1 Python版本问题

**错误：Python 3.6 或版本过低**

**症状：**
- `Could not find a version that satisfies the requirement fastapi==0.104.1`
- `ERROR: Could not open requirements file`
- Python版本显示为3.6或更低

**原因：**
- Python版本过低（项目需要3.8+，推荐3.11+）
- 当前目录不正确（找不到requirements.txt）

**解决方案：**

1. **检查当前状态：**
   ```bash
   cd /www/wwwroot/personal-web/
   bash deploy/diagnose.sh
   ```

2. **升级Python版本（推荐使用宝塔面板）：**
   - 在宝塔面板「软件商店」搜索「Python版本管理器」
   - 安装Python 3.11或更高版本
   - 在项目设置中选择Python 3.11

3. **或手动安装Python 3.11：**
   ```bash
   bash deploy/install-python311.sh
   ```

4. **重新创建虚拟环境：**
   ```bash
   # 删除旧的虚拟环境
   rm -rf .venv
   
   # 使用Python 3.11创建新虚拟环境
   python3.11 -m venv .venv
   source .venv/bin/activate
   
   # 安装依赖
   pip install --upgrade pip -i https://pypi.org/simple
   pip install -i https://pypi.org/simple -r requirements.txt
   ```

#### 10.2 后端无法启动

- 检查 `.env` 文件是否存在且配置正确
- 检查虚拟环境是否激活
- **检查Python版本是否符合要求（3.8+）**
- 查看PM2日志：`pm2 logs personal-web-api`
- 检查端口8000是否被占用：`netstat -tlnp | grep 8000`

#### 10.3 前端404错误

- 检查Nginx配置中的 `try_files` 是否正确
- 确认构建文件在正确的目录
- 检查Nginx错误日志：`/www/wwwlogs/`

#### 10.4 数据库连接失败

- 检查数据库用户名、密码是否正确
- 确认数据库已创建
- 检查MySQL是否允许本地连接
- 测试连接：`mysql -u用户名 -p密码 -h localhost personal_web`

#### 10.5 CORS跨域错误

- 检查 `.env` 中的 `CORS_ORIGINS` 是否包含前端域名
- 确认使用HTTPS时，CORS配置也是HTTPS
- 重启后端服务使配置生效

#### 10.6 OSS上传失败

- 检查OSS配置是否正确
- 确认AccessKey有相应权限
- 检查Bucket是否存在且可访问
- 查看后端日志排查具体错误

### 十一、性能优化建议

#### 11.1 后端优化

- 使用Gunicorn + Uvicorn Workers（已包含在部署步骤中）
- 根据服务器配置调整worker数量
- 启用Nginx缓存静态资源

#### 11.2 前端优化

- 启用Nginx Gzip压缩
- 配置静态资源缓存
- 使用CDN加速（OSS已配置）

#### 11.3 Nginx优化配置

在Nginx配置中添加：

```nginx
# Gzip压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 十二、备份与更新

#### 12.1 定期备份

- 数据库：使用宝塔「计划任务」定期备份MySQL
- 代码：使用Git版本控制
- 文件：备份 `/www/wwwroot/personal-web/` 目录

#### 12.2 更新代码

```bash
cd /www/wwwroot/personal-web/
git pull
source .venv/bin/activate
pip install -r requirements.txt  # 如果有新依赖
cd admin && npm install && npm run build
cd ../Web && npm install && npm run build
pm2 restart personal-web-api
```

### 十三、监控与日志

#### 13.1 查看日志

- Nginx访问日志：`/www/wwwlogs/你的域名.com.log`
- Nginx错误日志：`/www/wwwlogs/你的域名.com.error.log`
- PM2日志：`pm2 logs personal-web-api`
- 后端日志：查看PM2输出

#### 13.2 监控服务

- 使用宝塔「监控」查看服务器资源
- 使用PM2监控进程状态
- 配置宝塔「计划任务」定期检查服务健康

---

## 📝 部署检查清单

- [ ] 服务器环境准备完成（Nginx、MySQL、Python、Node.js）
- [ ] 项目文件已上传到服务器
- [ ] 数据库已创建并导入结构
- [ ] `.env` 文件已配置
- [ ] Python虚拟环境已创建并安装依赖
- [ ] 后端服务已启动（PM2管理）
- [ ] 前端已构建（admin和Web）
- [ ] Nginx已配置反向代理
- [ ] SSL证书已配置（HTTPS）
- [ ] 防火墙端口已开放
- [ ] 所有服务正常运行
- [ ] 域名解析已配置

---

**部署完成后，您的网站应该可以通过以下地址访问：**

- 🌐 主站：`https://你的域名.com`
- 🔧 管理后台：`https://admin.你的域名.com`
- 📡 API文档：`https://你的域名.com/docs`

如有问题，请查看日志文件或联系技术支持。
