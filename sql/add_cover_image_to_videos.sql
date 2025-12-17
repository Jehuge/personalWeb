-- 为视频表添加封面图片字段
ALTER TABLE `videos` 
ADD COLUMN `cover_image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '视频封面图片URL' 
AFTER `thumbnail_video_url`;

