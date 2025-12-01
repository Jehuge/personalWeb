#!/bin/bash
# 本地打包脚本 - 用于上传到服务器
# 使用方法: bash deploy/package-project.sh

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PROJECT_NAME="personal-web"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${PROJECT_NAME}_${TIMESTAMP}.tar.gz"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  打包项目文件${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查是否在项目根目录
if [ ! -f "app/main.py" ]; then
    echo -e "${YELLOW}错误: 请在项目根目录执行此脚本${NC}"
    exit 1
fi

echo "正在打包项目（排除 node_modules、.venv 等）..."

tar -czf "${OUTPUT_FILE}" \
    --exclude='node_modules' \
    --exclude='.venv' \
    --exclude='admin/node_modules' \
    --exclude='Web/node_modules' \
    --exclude='admin/dist' \
    --exclude='Web/dist' \
    --exclude='.git' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.DS_Store' \
    --exclude='*.log' \
    --exclude='.env' \
    --exclude='*.tar.gz' \
    --exclude='*.zip' \
    .

FILE_SIZE=$(du -h "${OUTPUT_FILE}" | cut -f1)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  打包完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "文件: ${OUTPUT_FILE}"
echo "大小: ${FILE_SIZE}"
echo ""
echo "下一步："
echo "1. 登录宝塔面板"
echo "2. 进入「文件」管理器 → /www/wwwroot/"
echo "3. 上传 ${OUTPUT_FILE}"
echo "4. 解压文件"
echo "5. 确保解压后目录为 /www/wwwroot/personal-web/"
echo ""







