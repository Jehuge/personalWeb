-- 为视频表添加多画质字段
ALTER TABLE `videos` 
ADD COLUMN `video_url_480p` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '标清视频URL（480p）' AFTER `thumbnail_video_url`,
ADD COLUMN `video_url_720p` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '高清视频URL（720p）' AFTER `video_url_480p`,
ADD COLUMN `video_url_480p_size` bigint(20) DEFAULT NULL COMMENT '标清视频文件大小（字节）' AFTER `video_url_720p`,
ADD COLUMN `video_url_720p_size` bigint(20) DEFAULT NULL COMMENT '高清视频文件大小（字节）' AFTER `video_url_480p_size`;

