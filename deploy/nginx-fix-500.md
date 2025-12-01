# Nginx 500错误排查和修复指南

## 🔍 快速诊断

运行诊断脚本：
```bash
cd /www/wwwroot/personal-web/
bash deploy/troubleshoot-nginx.sh
```

## 常见原因和解决方案

### 1. 后端服务未启动（最常见）

**症状：**
- 访问 `/api/health` 返回502或500
- Nginx错误日志显示 "Connection refused"

**解决：**
```bash
# 检查后端是否运行
pm2 list

# 如果未运行，启动后端
cd /www/wwwroot/personal-web/
source .venv/bin/activate
pm2 start uvicorn --name personal-web-api -- --host 0.0.0.0 --port 8000 app.main:app
pm2 save
```

### 2. 静态文件未构建

**症状：**
- 访问首页返回500
- Nginx错误日志显示 "No such file or directory"

**解决：**
```bash
# 构建Web前台
cd /www/wwwroot/personal-web/Web
npm run build

# 构建管理后台（如果需要）
cd /www/wwwroot/personal-web/admin
npm run build
```

### 3. 文件权限问题

**症状：**
- Nginx错误日志显示 "Permission denied"

**解决：**
```bash
# 检查Nginx运行用户
ps aux | grep nginx | head -1

# 设置正确的文件权限（假设Nginx用户是www）
chown -R www:www /www/wwwroot/personal-web/Web/dist
chmod -R 755 /www/wwwroot/personal-web/Web/dist
```

### 4. Nginx配置错误

**检查配置：**
```bash
# 测试Nginx配置
nginx -t

# 如果配置错误，检查配置文件语法
```

**正确的Nginx配置示例：**
```nginx
server {
    listen 80;
    server_name 你的域名.com www.你的域名.com;
    
    # 错误日志（用于调试）
    error_log /www/wwwlogs/personal-web-error.log;
    access_log /www/wwwlogs/personal-web-access.log;
    
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
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # WebSocket支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 5. 后端服务错误

**检查后端日志：**
```bash
# PM2日志
pm2 logs personal-web-api --lines 50

# 或直接测试后端
curl http://127.0.0.1:8000/health
```

**常见后端错误：**
- 数据库连接失败 → 检查 `.env` 中的 `DATABASE_URL`
- 缺少环境变量 → 检查 `.env` 文件是否存在
- Python依赖缺失 → 重新安装依赖

## 🔧 完整修复流程

### 步骤1：检查后端服务
```bash
# 检查PM2进程
pm2 list

# 测试后端API
curl http://127.0.0.1:8000/health

# 如果失败，查看日志
pm2 logs personal-web-api
```

### 步骤2：检查静态文件
```bash
# 检查文件是否存在
ls -la /www/wwwroot/personal-web/Web/dist/

# 如果不存在，构建前端
cd /www/wwwroot/personal-web/Web
npm run build
```

### 步骤3：检查Nginx配置
```bash
# 测试配置
nginx -t

# 查看错误日志
tail -50 /www/wwwlogs/error.log
```

### 步骤4：重启服务
```bash
# 重启后端
pm2 restart personal-web-api

# 重启Nginx
systemctl reload nginx
# 或
service nginx reload
```

## 📋 检查清单

- [ ] 后端服务正在运行（`pm2 list`）
- [ ] 后端API可访问（`curl http://127.0.0.1:8000/health`）
- [ ] 静态文件已构建（`ls /www/wwwroot/personal-web/Web/dist/index.html`）
- [ ] 文件权限正确（Nginx用户可以读取）
- [ ] Nginx配置正确（`nginx -t` 通过）
- [ ] Nginx错误日志无异常

## 🚨 紧急修复命令

如果所有方法都失败，执行完整重置：

```bash
# 1. 停止所有服务
pm2 stop all
systemctl stop nginx

# 2. 检查并修复
cd /www/wwwroot/personal-web/
source .venv/bin/activate

# 3. 重新构建前端
cd Web && npm run build
cd ../admin && npm run build

# 4. 启动后端
cd ..
pm2 start uvicorn --name personal-web-api -- --host 0.0.0.0 --port 8000 app.main:app
pm2 save

# 5. 重启Nginx
systemctl start nginx
nginx -t && systemctl reload nginx
```

## 📞 获取更多信息

查看详细日志：
```bash
# Nginx错误日志
tail -f /www/wwwlogs/error.log

# Nginx访问日志
tail -f /www/wwwlogs/access.log

# 后端PM2日志
pm2 logs personal-web-api --lines 100
```







