-- 视频管理相关表结构
-- 如果表已存在，可以忽略错误或先删除再创建

-- 视频分类表
CREATE TABLE IF NOT EXISTS `video_categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '分类ID',
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类名称',
  `slug` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类URL标识',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '分类描述',
  `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分类封面图片URL',
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  UNIQUE KEY `slug` (`slug`),
  KEY `idx_name` (`name`),
  KEY `idx_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频分类表';

-- 视频表
CREATE TABLE IF NOT EXISTS `videos` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '视频ID',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '视频标题',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '视频描述',
  `video_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原视频URL（OSS）',
  `thumbnail_video_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '缩略视频URL（OSS）',
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
  `created_at` datetime(6) DEFAULT CURRENT_TIMESTAMP(6) COMMENT '创建时间',
  `updated_at` datetime(6) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(6) COMMENT '更新时间',
  `published_at` datetime(6) DEFAULT NULL COMMENT '发布时间',
  PRIMARY KEY (`id`),
  KEY `idx_title` (`title`),
  KEY `idx_category_id` (`category_id`),
  KEY `idx_is_featured` (`is_featured`),
  KEY `idx_is_published` (`is_published`),
  CONSTRAINT `videos_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `video_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='视频表';

