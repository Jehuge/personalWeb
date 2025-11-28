-- 个人网站数据库初始化SQL
-- 数据库: personal_web
-- 字符集: utf8mb4
-- 排序规则: utf8mb4_unicode_ci

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `personal_web` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `personal_web`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
    `username` VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    `email` VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱地址',
    `hashed_password` VARCHAR(255) NOT NULL COMMENT '加密后的密码',
    `is_active` BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    `is_superuser` BOOLEAN DEFAULT FALSE COMMENT '是否超级管理员',
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
    `updated_at` DATETIME(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
    INDEX `idx_username` (`username`),
    INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 博客分类表
CREATE TABLE IF NOT EXISTS `categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '分类ID',
    `name` VARCHAR(50) NOT NULL UNIQUE COMMENT '分类名称',
    `slug` VARCHAR(50) NOT NULL UNIQUE COMMENT '分类URL标识',
    `description` TEXT COMMENT '分类描述',
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
    INDEX `idx_name` (`name`),
    INDEX `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='博客分类表';

-- 标签表
CREATE TABLE IF NOT EXISTS `tags` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '标签ID',
    `name` VARCHAR(30) NOT NULL UNIQUE COMMENT '标签名称',
    `slug` VARCHAR(30) NOT NULL UNIQUE COMMENT '标签URL标识',
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
    INDEX `idx_name` (`name`),
    INDEX `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

-- 博客表
CREATE TABLE IF NOT EXISTS `blogs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '博客ID',
    `title` VARCHAR(200) NOT NULL COMMENT '博客标题',
    `slug` VARCHAR(200) NOT NULL UNIQUE COMMENT '博客URL标识',
    `content` TEXT NOT NULL COMMENT '博客内容',
    `excerpt` TEXT COMMENT '博客摘要',
    `cover_image` VARCHAR(500) COMMENT '封面图片URL',
    `is_published` BOOLEAN DEFAULT FALSE COMMENT '是否已发布',
    `view_count` INT DEFAULT 0 COMMENT '浏览次数',
    `category_id` INT COMMENT '分类ID',
    `author_id` INT COMMENT '作者ID',
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
    `updated_at` DATETIME(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
    `published_at` DATETIME(6) DEFAULT NULL COMMENT '发布时间',
    INDEX `idx_title` (`title`),
    INDEX `idx_slug` (`slug`),
    INDEX `idx_category_id` (`category_id`),
    INDEX `idx_author_id` (`author_id`),
    INDEX `idx_is_published` (`is_published`),
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='博客表';

-- 博客标签关联表
CREATE TABLE IF NOT EXISTS `blog_tag` (
    `blog_id` INT NOT NULL COMMENT '博客ID',
    `tag_id` INT NOT NULL COMMENT '标签ID',
    PRIMARY KEY (`blog_id`, `tag_id`),
    FOREIGN KEY (`blog_id`) REFERENCES `blogs`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='博客标签关联表';

-- 摄影作品分类表
CREATE TABLE IF NOT EXISTS `photo_categories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '分类ID',
    `name` VARCHAR(50) NOT NULL UNIQUE COMMENT '分类名称',
    `slug` VARCHAR(50) NOT NULL UNIQUE COMMENT '分类URL标识',
    `description` TEXT COMMENT '分类描述',
    `cover_image` VARCHAR(500) COMMENT '分类封面图片URL',
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
    INDEX `idx_name` (`name`),
    INDEX `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='摄影作品分类表';

-- 摄影作品表
CREATE TABLE IF NOT EXISTS `photos` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '照片ID',
    `title` VARCHAR(200) NOT NULL COMMENT '照片标题',
    `description` TEXT COMMENT '照片描述',
    `image_url` VARCHAR(500) NOT NULL COMMENT '图片URL',
    `thumbnail_url` VARCHAR(500) COMMENT '缩略图URL',
    `width` INT COMMENT '图片宽度（像素）',
    `height` INT COMMENT '图片高度（像素）',
    `file_size` INT COMMENT '文件大小（字节）',
    `category_id` INT COMMENT '分类ID',
    `is_featured` BOOLEAN DEFAULT FALSE COMMENT '是否精选',
    `view_count` INT DEFAULT 0 COMMENT '浏览次数',
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
    `updated_at` DATETIME(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
    INDEX `idx_title` (`title`),
    INDEX `idx_category_id` (`category_id`),
    INDEX `idx_is_featured` (`is_featured`),
    FOREIGN KEY (`category_id`) REFERENCES `photo_categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='摄影作品表';

-- AI项目表
CREATE TABLE IF NOT EXISTS `ai_projects` (
    `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '项目ID',
    `title` VARCHAR(200) NOT NULL COMMENT '项目标题',
    `slug` VARCHAR(200) NOT NULL UNIQUE COMMENT '项目URL标识',
    `description` TEXT COMMENT '项目简短描述',
    `content` TEXT COMMENT '项目详细介绍',
    `cover_image` VARCHAR(500) COMMENT '封面图片URL',
    `demo_url` VARCHAR(500) COMMENT '演示地址',
    `github_url` VARCHAR(500) COMMENT 'GitHub地址',
    `tech_stack` VARCHAR(500) COMMENT '技术栈',
    `is_featured` BOOLEAN DEFAULT FALSE COMMENT '是否精选',
    `is_published` BOOLEAN DEFAULT FALSE COMMENT '是否已发布',
    `view_count` INT DEFAULT 0 COMMENT '浏览次数',
    `created_at` DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
    `updated_at` DATETIME(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
    `published_at` DATETIME(6) DEFAULT NULL COMMENT '发布时间',
    INDEX `idx_title` (`title`),
    INDEX `idx_slug` (`slug`),
    INDEX `idx_is_published` (`is_published`),
    INDEX `idx_is_featured` (`is_featured`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI项目表';

