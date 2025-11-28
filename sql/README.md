# 数据库初始化说明

## MySQL数据库设置

### 1. 创建数据库

有两种方式创建数据库：

#### 方式1: 使用SQL脚本（推荐）

```bash
# 登录MySQL
mysql -u root -p

# 执行SQL脚本
source sql/init.sql
```

或者直接执行：
```bash
mysql -u root -p < sql/init.sql
```

#### 方式2: 使用Python脚本（自动创建）

Python脚本会自动创建数据库（如果不存在），只需配置正确的连接信息：

```bash
python -m app.core.init_db
```

### 2. 配置环境变量

编辑 `.env` 文件，设置MySQL连接信息：

```env
DATABASE_URL=mysql+asyncmy://root:password@localhost:3306/personal_web
```

参数说明：
- `root`: MySQL用户名
- `password`: MySQL密码
- `localhost:3306`: MySQL主机和端口
- `personal_web`: 数据库名

### 3. 安装MySQL驱动

确保已安装asyncmy驱动：

```bash
pip install asyncmy
```

### 4. 初始化表结构

运行初始化脚本：

```bash
python -m app.core.init_db
```

## 注意事项

1. **字符集**: 数据库使用 `utf8mb4` 字符集，支持完整的UTF-8编码（包括emoji）
2. **时区**: 所有时间字段使用 `DATETIME(6)` 类型，支持微秒精度
3. **外键约束**: 已设置外键约束，确保数据完整性
4. **索引**: 已为常用查询字段创建索引，提升查询性能

## 表结构说明

- `users`: 用户表
- `categories`: 博客分类表
- `tags`: 标签表
- `blogs`: 博客文章表
- `blog_tag`: 博客标签关联表
- `photo_categories`: 摄影作品分类表
- `photos`: 摄影作品表
- `ai_projects`: AI项目表




