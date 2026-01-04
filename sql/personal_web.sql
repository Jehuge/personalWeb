-- phpMyAdmin SQL Dump
-- version 5.0.4
-- https://www.phpmyadmin.net/
--
-- 主机： localhost
-- 生成日期： 2026-01-04 09:26:50
-- 服务器版本： 5.7.43-log
-- PHP 版本： 7.4.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- 数据库： `personal_web`
--

-- --------------------------------------------------------

--
-- 表的结构 `ai_demos`
--

CREATE TABLE `ai_demos` (
  `id` int(11) NOT NULL COMMENT 'Demo ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标题',
  `slug` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'URL标识',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '描述',
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '封面',
  `category` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类',
  `tags` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标签',
  `bundle_path` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '静态目录',
  `entry_file` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT 'index.html' COMMENT '入口文件',
  `external_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '对外URL',
  `iframe_height` int(11) DEFAULT NULL COMMENT '默认 iframe 高度',
  `is_featured` tinyint(1) DEFAULT '0' COMMENT '是否精选',
  `is_published` tinyint(1) DEFAULT '0' COMMENT '是否已发布',
  `sort_order` int(11) DEFAULT '0' COMMENT '排序',
  `view_count` int(11) DEFAULT '0' COMMENT '浏览次数',
  `like_count` int(11) DEFAULT '0',
  `dislike_count` int(11) DEFAULT '0',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `published_at` datetime(6) DEFAULT NULL COMMENT '发布时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI Demo 表';

-- --------------------------------------------------------

--
-- 表的结构 `ai_images`
--

CREATE TABLE `ai_images` (
  `id` int(11) NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `image_url` varchar(500) NOT NULL,
  `prompt` text,
  `negative_prompt` text,
  `model_name` varchar(100) DEFAULT NULL,
  `parameters` json DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `tags` varchar(500) DEFAULT NULL,
  `is_featured` tinyint(1) DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT NULL,
  `view_count` int(11) DEFAULT NULL,
  `like_count` int(11) DEFAULT NULL,
  `dislike_count` int(11) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT NULL,
  `thumbnail_url` varchar(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- 表的结构 `ai_projects`
--

CREATE TABLE `ai_projects` (
  `id` int(11) NOT NULL COMMENT '项目ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '项目标题',
  `slug` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '项目URL标识',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '项目简短描述',
  `content` text COLLATE utf8mb4_unicode_ci COMMENT '项目详细介绍',
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '封面图片URL',
  `demo_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '演示地址',
  `github_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'GitHub地址',
  `tech_stack` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '技术栈',
  `is_featured` tinyint(1) DEFAULT '0' COMMENT '是否精选',
  `is_published` tinyint(1) DEFAULT '0' COMMENT '是否已发布',
  `view_count` int(11) DEFAULT '0' COMMENT '浏览次数',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `published_at` datetime(6) DEFAULT NULL COMMENT '发布时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI项目表';

-- --------------------------------------------------------

--
-- 表的结构 `blogs`
--

CREATE TABLE `blogs` (
  `id` int(11) NOT NULL COMMENT '博客ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '博客标题',
  `slug` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '博客URL标识',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '博客内容',
  `excerpt` text COLLATE utf8mb4_unicode_ci COMMENT '博客摘要',
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '封面图片URL',
  `is_published` tinyint(1) DEFAULT '0' COMMENT '是否已发布',
  `view_count` int(11) DEFAULT '0' COMMENT '浏览次数',
  `like_count` int(11) DEFAULT '0',
  `dislike_count` int(11) DEFAULT '0',
  `category_id` int(11) DEFAULT NULL COMMENT '分类ID',
  `author_id` int(11) DEFAULT NULL COMMENT '作者ID',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `published_at` datetime(6) DEFAULT NULL COMMENT '发布时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='博客表';

-- --------------------------------------------------------

--
-- 表的结构 `blog_tag`
--

CREATE TABLE `blog_tag` (
  `blog_id` int(11) NOT NULL COMMENT '博客ID',
  `tag_id` int(11) NOT NULL COMMENT '标签ID'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='博客标签关联表';

-- --------------------------------------------------------

--
-- 表的结构 `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL COMMENT '分类ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称',
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类URL标识',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '分类描述',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='博客分类表';

-- --------------------------------------------------------

--
-- 表的结构 `photos`
--

CREATE TABLE `photos` (
  `id` int(11) NOT NULL COMMENT '照片ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '照片标题',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '照片描述',
  `image_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '图片URL',
  `thumbnail_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '缩略图URL',
  `width` int(11) DEFAULT NULL COMMENT '图片宽度（像素）',
  `height` int(11) DEFAULT NULL COMMENT '图片高度（像素）',
  `file_size` int(11) DEFAULT NULL COMMENT '文件大小（字节）',
  `make` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '相机品牌',
  `model` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '相机型号',
  `focal_length` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '焦距',
  `aperture` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '光圈',
  `shutter_speed` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '快门',
  `iso` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ISO',
  `shoot_time` datetime(6) DEFAULT NULL COMMENT '拍摄时间',
  `exif` json DEFAULT NULL COMMENT '原始EXIF数据',
  `category_id` int(11) DEFAULT NULL COMMENT '分类ID',
  `is_featured` tinyint(1) DEFAULT '0' COMMENT '是否精选',
  `view_count` int(11) DEFAULT '0' COMMENT '浏览次数',
  `like_count` int(11) DEFAULT '0',
  `dislike_count` int(11) DEFAULT '0',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='摄影作品表';

-- --------------------------------------------------------

--
-- 表的结构 `photo_categories`
--

CREATE TABLE `photo_categories` (
  `id` int(11) NOT NULL COMMENT '分类ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称',
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类URL标识',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '分类描述',
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类封面图片URL',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='摄影作品分类表';

-- --------------------------------------------------------

--
-- 表的结构 `tags`
--

CREATE TABLE `tags` (
  `id` int(11) NOT NULL COMMENT '标签ID',
  `name` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签名称',
  `slug` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标签URL标识',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标签表';

-- --------------------------------------------------------

--
-- 表的结构 `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL COMMENT '用户ID',
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱地址',
  `hashed_password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '加密后的密码',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否激活',
  `is_superuser` tinyint(1) DEFAULT '0' COMMENT '是否超级管理员',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- --------------------------------------------------------

--
-- 表的结构 `videos`
--

CREATE TABLE `videos` (
  `id` int(11) NOT NULL COMMENT '视频ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '视频标题',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '视频描述',
  `video_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原视频URL（OSS）',
  `thumbnail_video_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '缩略视频URL（OSS）',
  `video_url_480p` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标清视频URL（480p）',
  `video_url_720p` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '高清视频URL（720p）',
  `video_url_480p_size` bigint(20) DEFAULT NULL COMMENT '标清视频文件大小（字节）',
  `video_url_720p_size` bigint(20) DEFAULT NULL COMMENT '高清视频文件大小（字节）',
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '视频封面图片URL',
  `duration` int(11) DEFAULT NULL COMMENT '视频时长（秒）',
  `width` int(11) DEFAULT NULL COMMENT '视频宽度（像素）',
  `height` int(11) DEFAULT NULL COMMENT '视频高度（像素）',
  `file_size` bigint(20) DEFAULT NULL COMMENT '原视频文件大小（字节）',
  `thumbnail_file_size` bigint(20) DEFAULT NULL COMMENT '缩略视频文件大小（字节）',
  `format` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '视频格式（如mp4, mov等）',
  `codec` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '视频编码（如h264, hevc等）',
  `fps` decimal(10,2) DEFAULT NULL COMMENT '帧率',
  `bitrate` int(11) DEFAULT NULL COMMENT '比特率（bps）',
  `category_id` int(11) DEFAULT NULL COMMENT '分类ID',
  `is_featured` tinyint(1) DEFAULT '0' COMMENT '是否精选',
  `is_published` tinyint(1) DEFAULT '0' COMMENT '是否已发布',
  `view_count` int(11) DEFAULT '0' COMMENT '浏览次数',
  `like_count` int(11) DEFAULT '0',
  `dislike_count` int(11) DEFAULT '0',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `published_at` datetime(6) DEFAULT NULL COMMENT '发布时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频表';

-- --------------------------------------------------------

--
-- 表的结构 `video_categories`
--

CREATE TABLE `video_categories` (
  `id` int(11) NOT NULL COMMENT '分类ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称',
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类URL标识',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '分类描述',
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类封面图片URL',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频分类表';

-- --------------------------------------------------------

--
-- 表的结构 `votes`
--

CREATE TABLE `votes` (
  `id` int(11) NOT NULL,
  `content_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content_id` int(11) NOT NULL,
  `action` int(1) NOT NULL,
  `visitor_id` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- 转储表的索引
--

--
-- 表的索引 `ai_demos`
--
ALTER TABLE `ai_demos`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_slug_demo` (`slug`),
  ADD KEY `idx_is_published_demo` (`is_published`),
  ADD KEY `idx_sort_order_demo` (`sort_order`);

--
-- 表的索引 `ai_images`
--
ALTER TABLE `ai_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_ai_images_id` (`id`);

--
-- 表的索引 `ai_projects`
--
ALTER TABLE `ai_projects`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_title` (`title`),
  ADD KEY `idx_slug` (`slug`),
  ADD KEY `idx_is_published` (`is_published`),
  ADD KEY `idx_is_featured` (`is_featured`);

--
-- 表的索引 `blogs`
--
ALTER TABLE `blogs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_title` (`title`),
  ADD KEY `idx_slug` (`slug`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_author_id` (`author_id`),
  ADD KEY `idx_is_published` (`is_published`);

--
-- 表的索引 `blog_tag`
--
ALTER TABLE `blog_tag`
  ADD PRIMARY KEY (`blog_id`,`tag_id`),
  ADD KEY `tag_id` (`tag_id`);

--
-- 表的索引 `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_slug` (`slug`);

--
-- 表的索引 `photos`
--
ALTER TABLE `photos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_title` (`title`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_is_featured` (`is_featured`);

--
-- 表的索引 `photo_categories`
--
ALTER TABLE `photo_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_slug` (`slug`);

--
-- 表的索引 `tags`
--
ALTER TABLE `tags`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_slug` (`slug`);

--
-- 表的索引 `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_username` (`username`),
  ADD KEY `idx_email` (`email`);

--
-- 表的索引 `videos`
--
ALTER TABLE `videos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_title` (`title`),
  ADD KEY `idx_category_id` (`category_id`),
  ADD KEY `idx_is_featured` (`is_featured`),
  ADD KEY `idx_is_published` (`is_published`);

--
-- 表的索引 `video_categories`
--
ALTER TABLE `video_categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`),
  ADD UNIQUE KEY `slug` (`slug`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_slug` (`slug`);

--
-- 表的索引 `votes`
--
ALTER TABLE `votes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_content` (`content_type`,`content_id`),
  ADD KEY `idx_visitor` (`visitor_id`);

--
-- 在导出的表使用AUTO_INCREMENT
--

--
-- 使用表AUTO_INCREMENT `ai_demos`
--
ALTER TABLE `ai_demos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Demo ID';

--
-- 使用表AUTO_INCREMENT `ai_images`
--
ALTER TABLE `ai_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 使用表AUTO_INCREMENT `ai_projects`
--
ALTER TABLE `ai_projects`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '项目ID';

--
-- 使用表AUTO_INCREMENT `blogs`
--
ALTER TABLE `blogs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '博客ID';

--
-- 使用表AUTO_INCREMENT `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '分类ID';

--
-- 使用表AUTO_INCREMENT `photos`
--
ALTER TABLE `photos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '照片ID';

--
-- 使用表AUTO_INCREMENT `photo_categories`
--
ALTER TABLE `photo_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '分类ID';

--
-- 使用表AUTO_INCREMENT `tags`
--
ALTER TABLE `tags`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '标签ID';

--
-- 使用表AUTO_INCREMENT `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '用户ID';

--
-- 使用表AUTO_INCREMENT `videos`
--
ALTER TABLE `videos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '视频ID';

--
-- 使用表AUTO_INCREMENT `video_categories`
--
ALTER TABLE `video_categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '分类ID';

--
-- 使用表AUTO_INCREMENT `votes`
--
ALTER TABLE `votes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- 限制导出的表
--

--
-- 限制表 `blogs`
--
ALTER TABLE `blogs`
  ADD CONSTRAINT `blogs_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `blogs_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- 限制表 `blog_tag`
--
ALTER TABLE `blog_tag`
  ADD CONSTRAINT `blog_tag_ibfk_1` FOREIGN KEY (`blog_id`) REFERENCES `blogs` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `blog_tag_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE;

--
-- 限制表 `photos`
--
ALTER TABLE `photos`
  ADD CONSTRAINT `photos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `photo_categories` (`id`) ON DELETE SET NULL;

--
-- 限制表 `videos`
--
ALTER TABLE `videos`
  ADD CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `video_categories` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
