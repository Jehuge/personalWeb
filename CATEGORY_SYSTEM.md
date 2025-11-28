# 分类系统实现说明

## 系统分类架构

系统实现了三层分类体系：

1. 内容分类（数据库管理）- 博客分类、摄影分类
2. 标签系统（数据库管理）- 博客标签
3. 文件分类（OSS自动）- 按时间和类型自动分类

---

## 一、博客分类系统

### 数据库设计

#### 分类表 (categories)
- id: 分类ID
- name: 分类名称（如"技术分享"）
- slug: URL标识（如"tech-share"）
- description: 分类描述
- created_at: 创建时间

#### 标签表 (tags)
- id: 标签ID
- name: 标签名称（如"Python"）
- slug: URL标识（如"python"）
- created_at: 创建时间

#### 关系
- 博客 → 分类：一对一关系（一个博客属于一个分类）
- 博客 → 标签：多对多关系（一个博客可以有多个标签）

### API接口
- GET /api/blogs/categories - 获取所有分类
- POST /api/blogs/categories - 创建分类
- PUT /api/blogs/categories/{id} - 更新分类
- DELETE /api/blogs/categories/{id} - 删除分类

### 管理界面
- 博客分类管理: http://localhost:3000/blog-categories
- 标签管理: http://localhost:3000/tags

---

## 二、摄影分类系统

### 数据库设计

#### 摄影分类表 (photo_categories)
- id: 分类ID
- name: 分类名称（如"风景摄影"）
- slug: URL标识（如"landscape"）
- description: 分类描述
- cover_image: 分类封面图
- created_at: 创建时间

#### 关系
- 摄影作品 → 分类：一对一关系（一个作品属于一个分类）

### API接口
- GET /api/photos/categories - 获取所有分类
- POST /api/photos/categories - 创建分类
- PUT /api/photos/categories/{id} - 更新分类
- DELETE /api/photos/categories/{id} - 删除分类

### 管理界面
- 摄影分类管理: http://localhost:3000/photo-categories

---

## 三、OSS文件分类系统

### 自动分类规则

#### 按类型分类
- images/ - 所有图片文件（博客封面、摄影作品、AI项目封面）
- files/ - 其他类型文件（PDF、文档等）

#### 按时间分类
- YYYY/MM/ - 按年月自动分类
- 示例: images/2025/11/uuid.jpg

### 特点
- 无需手动创建文件夹
- OSS自动识别路径并创建文件夹结构
- 按年月自动组织

### 查看方式
- OSS控制台: 登录阿里云OSS，在"文件管理"中查看
- 媒体资源管理: http://localhost:3000/media

---

## 四、使用流程

### 创建分类
1. 访问管理界面
2. 点击"新建分类"
3. 填写分类信息
4. 保存

### 使用分类
1. 创建博客/摄影作品时选择分类
2. 系统自动关联分类
3. 可通过分类筛选内容

---

## 总结

系统实现了完整的三层分类体系：
1. 博客分类 - 分类 + 标签，灵活多维度
2. 摄影分类 - 简单清晰的分类系统
3. 文件分类 - 自动按时间和类型组织

所有分类都通过数据库管理，支持完整的CRUD操作。
