# 阿里云OSS配置指南

## 一、创建OSS Bucket

### 1. 登录阿里云控制台

1. 访问 [阿里云官网](https://www.aliyun.com/)
2. 登录您的阿里云账号
3. 进入 [OSS控制台](https://oss.console.aliyun.com/)

### 2. 创建Bucket

1. 点击左侧菜单「Bucket列表」
2. 点击「创建Bucket」按钮
3. 填写Bucket配置：

   **基本信息：**
   - **Bucket名称**: 输入一个唯一的名称（例如：`my-personal-web`）
     - 只能包含小写字母、数字和短横线（-）
     - 必须以字母或数字开头和结尾
     - 长度在3-63个字符之间
   - **地域**: 选择离您最近的地域（例如：华东1（杭州））
   - **存储类型**: 选择「标准存储」（适合频繁访问的文件）
   - **读写权限**: 选择「私有」（推荐）或「公共读」
     - **私有**: 更安全，需要通过签名URL访问
     - **公共读**: 可以直接通过URL访问，适合图片等公开资源

   **高级配置（可选）：**
   - **版本控制**: 根据需要开启
   - **服务端加密**: 建议开启
   - **同城冗余存储**: 根据需求选择

4. 点击「确定」完成创建

### 3. 获取Endpoint

创建Bucket后，在Bucket详情页面可以看到：
- **Endpoint（地域节点）**: 例如 `oss-cn-hangzhou.aliyuncs.com`
- 记录下这个Endpoint，后续配置需要用到

## 二、创建AccessKey

### 1. 访问RAM访问控制

1. 在阿里云控制台，点击右上角头像
2. 选择「AccessKey管理」
3. 或直接访问 [RAM访问控制](https://ram.console.aliyun.com/manage/ak)

### 2. 创建AccessKey

**方式一：使用主账号AccessKey（不推荐，仅测试使用）**
1. 在AccessKey管理页面，点击「创建AccessKey」
2. 完成安全验证（手机验证码等）
3. 记录下：
   - **AccessKey ID**
   - **AccessKey Secret**（只显示一次，请妥善保存）

**方式二：创建RAM子账号（推荐，更安全）**

1. 进入 [RAM控制台](https://ram.console.aliyun.com/)
2. 点击「用户」→「创建用户」
3. 填写用户信息：
   - **登录名称**: 例如 `oss-user`
   - **显示名称**: 例如 `OSS用户`
4. 选择「编程访问」，生成AccessKey
5. 记录下AccessKey ID和Secret

### 3. 授权RAM用户

1. 在用户列表中找到刚创建的用户
2. 点击「添加权限」
3. 选择「AliyunOSSFullAccess」（OSS完全访问权限）
4. 或创建自定义策略，只授予特定Bucket的权限

## 三、配置CDN（可选，推荐）

### 1. 开通CDN服务

1. 访问 [CDN控制台](https://cdn.console.aliyun.com/)
2. 如果未开通，按提示开通CDN服务

### 2. 添加CDN域名

1. 点击「域名管理」→「添加域名」
2. 填写配置：
   - **加速域名**: 例如 `cdn.yourdomain.com`
   - **业务类型**: 选择「图片小文件」
   - **源站信息**: 
     - 源站类型：选择「OSS域名」
     - 源站地址：选择您创建的Bucket
3. 完成配置后，等待CDN审核通过（通常几分钟）

### 3. 配置CNAME

1. 在CDN域名列表中，找到您的域名
2. 复制CNAME地址
3. 在您的域名DNS服务商处添加CNAME记录
4. 等待DNS生效（通常几分钟到几小时）

## 四、项目配置

### 1. 编辑环境变量文件

在项目根目录创建或编辑 `.env` 文件：

```env
# OSS配置
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=my-personal-web
OSS_BASE_URL=https://cdn.yourdomain.com
```

### 2. 配置说明

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `OSS_ACCESS_KEY_ID` | 阿里云AccessKey ID | `LTAI5txxxxxxxxxxxxx` |
| `OSS_ACCESS_KEY_SECRET` | 阿里云AccessKey Secret | `xxxxxxxxxxxxxxxxxxxxx` |
| `OSS_ENDPOINT` | OSS地域节点 | `oss-cn-hangzhou.aliyuncs.com` |
| `OSS_BUCKET_NAME` | Bucket名称 | `my-personal-web` |
| `OSS_BASE_URL` | CDN域名（可选） | `https://cdn.yourdomain.com` |

### 3. 配置示例

**完整配置示例：**
```env
# 应用配置
APP_NAME=个人网站
APP_VERSION=1.0.0
DEBUG=True

# 数据库配置
DATABASE_URL=mysql+asyncmy://root:password@localhost:3306/personal_web

# JWT配置
SECRET_KEY=your-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# OSS配置
OSS_ACCESS_KEY_ID=LTAI5txxxxxxxxxxxxx
OSS_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=my-personal-web
OSS_BASE_URL=https://cdn.yourdomain.com

# CORS配置
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

## 五、验证配置

### 1. 检查配置

重启后端服务后，检查日志中是否有OSS相关错误：

```bash
# 查看后端服务日志
tail -f /tmp/uvicorn.log
```

### 2. 测试上传

1. 访问管理界面：http://localhost:3000
2. 登录后，尝试上传一张图片
3. 如果上传成功，说明配置正确

### 3. 检查OSS文件

1. 登录阿里云OSS控制台
2. 进入您的Bucket
3. 查看「文件管理」，应该能看到上传的文件
4. 文件路径格式：`images/2025/11/uuid.jpg`

## 六、常见问题

### 1. 上传失败：AccessDenied

**原因**: AccessKey权限不足或Bucket权限设置错误

**解决方法**:
- 检查RAM用户是否授予了OSS权限
- 检查Bucket的读写权限设置
- 确认AccessKey ID和Secret正确

### 2. 上传失败：InvalidAccessKeyId

**原因**: AccessKey ID错误或不存在

**解决方法**:
- 检查 `.env` 文件中的 `OSS_ACCESS_KEY_ID` 是否正确
- 确认AccessKey未被删除或禁用

### 3. 上传失败：SignatureDoesNotMatch

**原因**: AccessKey Secret错误

**解决方法**:
- 检查 `.env` 文件中的 `OSS_ACCESS_KEY_SECRET` 是否正确
- 注意不要有多余的空格或换行

### 4. 文件无法访问

**原因**: Bucket权限设置为私有，但未配置CDN

**解决方法**:
- 方案1：将Bucket权限改为「公共读」（不推荐，安全性较低）
- 方案2：配置CDN，使用CDN域名访问（推荐）
- 方案3：使用OSS的签名URL功能（需要代码支持）

### 5. CDN不生效

**原因**: DNS配置未生效或CDN未审核通过

**解决方法**:
- 检查DNS的CNAME记录是否正确
- 等待DNS生效（可使用 `nslookup cdn.yourdomain.com` 检查）
- 确认CDN域名审核状态

## 七、安全建议

### 1. 使用RAM子账号

- 不要使用主账号的AccessKey
- 创建专门的RAM子账号用于OSS访问
- 只授予必要的权限（最小权限原则）

### 2. 定期轮换AccessKey

- 定期更换AccessKey
- 删除不再使用的AccessKey

### 3. 保护AccessKey Secret

- 不要将 `.env` 文件提交到Git仓库
- 在生产环境使用环境变量或密钥管理服务
- 不要在代码中硬编码AccessKey

### 4. 设置Bucket权限

- 推荐使用「私有」权限
- 通过CDN或签名URL访问资源
- 避免使用「公共读写」权限

### 5. 启用日志和监控

- 开启OSS访问日志
- 设置异常访问告警
- 定期检查访问日志

## 八、成本优化

### 1. 选择合适的存储类型

- **标准存储**: 适合频繁访问的文件（如网站图片）
- **低频访问存储**: 适合不常访问的文件
- **归档存储**: 适合长期保存的备份文件

### 2. 使用CDN加速

- CDN可以降低OSS的流量费用
- 提高文件访问速度
- 减少OSS的请求次数

### 3. 图片压缩和优化

- 系统已自动压缩上传的图片
- 生成缩略图减少存储空间
- 使用合适的图片格式（WebP等）

### 4. 定期清理

- 使用媒体资源管理界面定期清理
- 删除不再使用的文件
- 避免存储冗余文件

## 九、快速配置脚本

创建 `setup_oss.sh` 脚本快速配置：

```bash
#!/bin/bash

echo "=== 阿里云OSS配置向导 ==="
echo ""

read -p "请输入OSS_ACCESS_KEY_ID: " ACCESS_KEY_ID
read -p "请输入OSS_ACCESS_KEY_SECRET: " ACCESS_KEY_SECRET
read -p "请输入OSS_ENDPOINT (例如: oss-cn-hangzhou.aliyuncs.com): " ENDPOINT
read -p "请输入OSS_BUCKET_NAME: " BUCKET_NAME
read -p "请输入OSS_BASE_URL (CDN域名，可选，直接回车跳过): " BASE_URL

# 更新.env文件
if [ -f .env ]; then
    # 删除旧的OSS配置
    sed -i '' '/^OSS_/d' .env
fi

# 添加新的OSS配置
cat >> .env << EOF

# OSS配置
OSS_ACCESS_KEY_ID=$ACCESS_KEY_ID
OSS_ACCESS_KEY_SECRET=$ACCESS_KEY_SECRET
OSS_ENDPOINT=$ENDPOINT
OSS_BUCKET_NAME=$BUCKET_NAME
EOF

if [ ! -z "$BASE_URL" ]; then
    echo "OSS_BASE_URL=$BASE_URL" >> .env
fi

echo ""
echo "✅ OSS配置已更新到 .env 文件"
echo "请重启后端服务使配置生效"
```

使用方法：
```bash
chmod +x setup_oss.sh
./setup_oss.sh
```

## 十、配置检查清单

- [ ] 已创建OSS Bucket
- [ ] 已获取Endpoint
- [ ] 已创建AccessKey（推荐使用RAM子账号）
- [ ] 已配置RAM用户权限
- [ ] 已填写 `.env` 文件中的OSS配置
- [ ] 已配置CDN（可选但推荐）
- [ ] 已测试文件上传功能
- [ ] 已验证文件可以正常访问
- [ ] 已设置 `.env` 文件权限（避免泄露）

完成以上配置后，您的OSS就可以正常使用了！


