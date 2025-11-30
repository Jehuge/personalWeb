# 快速部署检查清单

## 📋 部署前准备

- [ ] 阿里云服务器已购买并配置
- [ ] 宝塔面板已安装并可以访问
- [ ] 域名已购买并解析到服务器IP
- [ ] 阿里云OSS已创建并配置（可选，用于文件存储）

## 🚀 快速部署步骤

### 1. 服务器环境（5分钟）

在宝塔面板「软件商店」安装：
- [ ] Nginx 1.22+
- [ ] MySQL 8.0+
- [ ] **Python 3.11+**（重要！项目需要Python 3.8+，推荐3.11+）
- [ ] Python项目管理器 或 PM2管理器
- [ ] Node.js版本管理器（Node.js 18+）
- [ ] Git（可选，如果使用Git方式）

**检查Python版本：**
```bash
python3 --version
# 如果版本低于3.8，需要升级
```

**如果Python版本过低：**
- 在宝塔面板「软件商店」安装「Python版本管理器」，选择Python 3.11+
- 或运行：`bash deploy/install-python311.sh`

**如果使用Git但提示"未找到命令"，安装Git：**
```bash
# CentOS/RHEL
yum install -y git

# Ubuntu/Debian  
apt-get update && apt-get install -y git
```

### 2. 上传项目（5分钟）

**方式一：使用宝塔文件管理器（推荐，无需Git）**

1. **在本地打包项目**（排除 node_modules 和 .venv）：
   ```bash
   # 在本地项目目录执行
   tar -czf personal-web.tar.gz \
     --exclude='node_modules' \
     --exclude='.venv' \
     --exclude='admin/node_modules' \
     --exclude='Web/node_modules' \
     --exclude='.git' \
     .
   ```

2. **上传到服务器**：
   - 登录宝塔面板 → 「文件」管理器
   - 进入 `/www/wwwroot/`
   - 点击「上传」，选择 `personal-web.tar.gz`
   - 上传后右键解压
   - 确保解压后目录为 `/www/wwwroot/personal-web/`

**方式二：使用Git（需要先安装Git）**
```bash
cd /www/wwwroot/
git clone https://你的仓库地址 personal-web
cd personal-web
```

### 3. 数据库配置（5分钟）

- [ ] 在宝塔「数据库」创建数据库：`personal_web`
- [ ] 导入 `sql/init.sql` 到数据库
- [ ] 记录数据库用户名和密码

### 4. 环境变量配置（5分钟）

```bash
cd /www/wwwroot/personal-web/
cp deploy/.env.example .env
nano .env  # 或使用宝塔文件管理器编辑
```

**必填项：**
- [ ] `DATABASE_URL` - 数据库连接
- [ ] `SECRET_KEY` - JWT密钥（至少32位随机字符串）
- [ ] `OSS_*` - OSS配置（如果使用文件上传）
- [ ] `CORS_ORIGINS` - 前端域名（HTTPS）

### 5. 一键部署（10分钟）

```bash
cd /www/wwwroot/personal-web/
bash deploy/deploy.sh
```

脚本会自动：
- [ ] 创建Python虚拟环境
- [ ] 安装Python依赖
- [ ] 构建前端（Admin和Web）
- [ ] 启动后端服务（PM2）

### 6. Nginx配置（10分钟）

#### 6.1 创建网站

在宝塔「网站」→「添加站点」：
- [ ] 主站：`你的域名.com` → `/www/wwwroot/personal-web/Web/dist`
- [ ] 管理后台：`admin.你的域名.com` → `/www/wwwroot/personal-web/admin/dist`

#### 6.2 配置反向代理

编辑网站「设置」→「配置文件」，参考 `deploy/nginx.conf.example`

**关键配置：**
- [ ] `/api` 路径代理到 `http://127.0.0.1:8000`
- [ ] 静态文件正确指向 `dist` 目录
- [ ] `try_files` 配置支持前端路由

#### 6.3 SSL证书

- [ ] 在网站「设置」→「SSL」申请Let's Encrypt证书
- [ ] 启用「强制HTTPS」
- [ ] 更新 `.env` 中的 `CORS_ORIGINS` 为HTTPS地址

### 7. 防火墙（2分钟）

在宝塔「安全」开放端口：
- [ ] 80（HTTP）
- [ ] 443（HTTPS）
- [ ] 8000（后端，仅内网，可不开放）

### 8. 验证部署（5分钟）

- [ ] 访问 `https://你的域名.com/api/health` → 应返回 `{"status":"ok"}`
- [ ] 访问 `https://你的域名.com` → 应显示Web前台
- [ ] 访问 `https://admin.你的域名.com` → 应显示管理后台
- [ ] 访问 `https://你的域名.com/docs` → 应显示API文档

## 🔧 常用命令

```bash
# 查看后端服务状态
pm2 list
pm2 logs personal-web-api

# 重启后端服务
pm2 restart personal-web-api

# 查看Nginx日志
tail -f /www/wwwlogs/你的域名.com.log

# 更新代码
cd /www/wwwroot/personal-web/
git pull
bash deploy/deploy.sh
```

## ❗ 常见问题

### pip依赖安装失败（版本不匹配）

**错误：Could not find a version that satisfies the requirement fastapi==0.104.1**

**原因**：阿里云镜像源未同步最新版本（最高只有0.83.0）

**解决方案：**

```bash
# 方案1：使用官方PyPI源（推荐）
pip install --upgrade pip -i https://pypi.org/simple
pip install -i https://pypi.org/simple -r requirements.txt

# 方案2：使用修复脚本（自动处理）
bash deploy/fix-pip-source.sh

# 方案3：使用兼容版本（如果官方源访问慢）
pip install -r requirements-compatible.txt

# 方案4：使用清华镜像源（更新较快）
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple -r requirements.txt
```

### 后端无法启动
```bash
# 检查日志
pm2 logs personal-web-api

# 检查环境变量
cat .env

# 手动测试启动
source .venv/bin/activate
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 前端404
- 检查Nginx配置中的 `root` 路径是否正确
- 确认 `dist` 目录存在且包含 `index.html`
- 检查 `try_files` 配置

### 数据库连接失败
```bash
# 测试数据库连接
mysql -u用户名 -p密码 -h localhost personal_web
```

### CORS跨域错误
- 确认 `.env` 中的 `CORS_ORIGINS` 包含前端域名
- 使用HTTPS时，CORS配置也必须是HTTPS
- 重启后端服务：`pm2 restart personal-web-api`

## 📚 详细文档

遇到问题请查看：
- [完整部署指南](./../DEPLOY_BT.md)
- [Nginx配置示例](./nginx.conf.example)
- [PM2配置](./pm2.config.js)

---

**预计总耗时：约30-45分钟**

部署完成后，记得：
1. 修改默认管理员密码
2. 定期备份数据库
3. 监控服务器资源使用情况

