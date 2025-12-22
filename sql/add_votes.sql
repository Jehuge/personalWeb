-- 添加 votes 表和 like/dislike 计数列
ALTER TABLE `blogs`
  ADD COLUMN `like_count` int(11) DEFAULT 0 AFTER `view_count`,
  ADD COLUMN `dislike_count` int(11) DEFAULT 0 AFTER `like_count`;

ALTER TABLE `photos`
  ADD COLUMN `like_count` int(11) DEFAULT 0 AFTER `view_count`,
  ADD COLUMN `dislike_count` int(11) DEFAULT 0 AFTER `like_count`;

ALTER TABLE `videos`
  ADD COLUMN `like_count` int(11) DEFAULT 0 AFTER `view_count`,
  ADD COLUMN `dislike_count` int(11) DEFAULT 0 AFTER `like_count`;

ALTER TABLE `ai_demos`
  ADD COLUMN `like_count` int(11) DEFAULT 0 AFTER `view_count`,
  ADD COLUMN `dislike_count` int(11) DEFAULT 0 AFTER `like_count`;

-- ai_images 已包含 like_count，此处确保 dislike_count 存在
ALTER TABLE `ai_images`
  ADD COLUMN `dislike_count` int(11) DEFAULT 0 AFTER `like_count`;

-- 创建通用投票表
CREATE TABLE IF NOT EXISTS `votes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `content_type` varchar(50) NOT NULL,
  `content_id` int(11) NOT NULL,
  `action` int(1) NOT NULL,
  `visitor_id` varchar(200) DEFAULT NULL,
  `user_agent` text,
  `ip` varchar(45) DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_content` (`content_type`, `content_id`),
  INDEX `idx_visitor` (`visitor_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


