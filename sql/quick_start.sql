-- 快速启动脚本
-- 用于快速创建数据库和表结构

-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS `personal_web` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

-- 2. 使用数据库
USE `personal_web`;

-- 3. 执行完整的建表脚本
SOURCE sql/init.sql;

-- 或者直接执行以下命令：
-- mysql -u root -p < sql/init.sql

