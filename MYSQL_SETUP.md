# MySQL数据库配置指南

## 快速开始

### 1. 安装MySQL驱动

```bash
pip install asyncmy
```

或者安装所有依赖：

```bash
pip install -r requirements.txt
```

### 2. 创建数据库

有两种方式：

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

### 3. 配置环境变量

创建或编辑 `.env` 文件：

```env
# MySQL数据库配置
# 格式: mysql+asyncmy://用户名:密码@主机:端口/数据库名
DATABASE_URL=mysql+asyncmy://root:password@localhost:3306/personal_web
```

**参数说明：**
- `root`: MySQL用户名（根据实际情况修改）
- `password`: MySQL密码（根据实际情况修改）
- `localhost:3306`: MySQL主机和端口（默认3306）
- `personal_web`: 数据库名

**示例：**
```env
# 本地MySQL，用户名为root，密码为123456
DATABASE_URL=mysql+asyncmy://root:123456@localhost:3306/personal_web

# 远程MySQL服务器
DATABASE_URL=mysql+asyncmy://user:pass@192.168.1.100:3306/personal_web

# 带特殊字符的密码（需要URL编码）
# 例如密码是: p@ssw0rd
DATABASE_URL=mysql+asyncmy://root:p%40ssw0rd@localhost:3306/personal_web
```

### 4. 初始化表结构

运行初始化脚本：

```bash
python -m app.core.init_db
```

如果一切正常，你会看到类似输出：

```
正在连接数据库: localhost:3306/personal_web
数据库 'personal_web' 已准备就绪
数据库表结构初始化完成！
```

## 常见问题

### 1. 连接失败

**错误信息：** `Can't connect to MySQL server`

**解决方案：**
- 确保MySQL服务已启动
- 检查主机和端口是否正确
- 检查防火墙设置

### 2. 认证失败

**错误信息：** `Access denied for user`

**解决方案：**
- 检查用户名和密码是否正确
- 确保用户有创建数据库的权限
- 如果密码包含特殊字符，需要进行URL编码

### 3. 数据库不存在

**错误信息：** `Unknown database`

**解决方案：**
- 手动创建数据库：`CREATE DATABASE personal_web;`
- 或者让Python脚本自动创建（需要用户有CREATE DATABASE权限）

### 4. 字符集问题

**确保数据库使用utf8mb4字符集：**

```sql
ALTER DATABASE personal_web CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 数据库表结构

项目包含以下表：

1. **users** - 用户表
2. **categories** - 博客分类表
3. **tags** - 标签表
4. **blogs** - 博客文章表
5. **blog_tag** - 博客标签关联表
6. **photo_categories** - 摄影作品分类表
7. **photos** - 摄影作品表
8. **ai_projects** - AI项目表

所有表都使用：
- 字符集：`utf8mb4`
- 排序规则：`utf8mb4_unicode_ci`
- 存储引擎：`InnoDB`

## 从SQLite迁移到MySQL

如果你之前使用的是SQLite，现在想迁移到MySQL：

1. 导出SQLite数据（可选）
2. 按照上述步骤配置MySQL
3. 运行初始化脚本创建表结构
4. 如果需要迁移数据，可以使用数据迁移工具

## 性能优化建议

1. **索引优化**：所有常用查询字段已创建索引
2. **连接池**：SQLAlchemy会自动管理连接池
3. **查询优化**：使用异步查询提升性能

## 备份和恢复

### 备份数据库

```bash
mysqldump -u root -p personal_web > backup.sql
```

### 恢复数据库

```bash
mysql -u root -p personal_web < backup.sql
```




