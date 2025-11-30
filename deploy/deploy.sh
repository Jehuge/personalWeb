#!/bin/bash
# 一键部署脚本（适用于宝塔面板）
# 使用方法: bash deploy.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_DIR="/www/wwwroot/personal-web"
VENV_DIR="${PROJECT_DIR}/.venv"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  个人网站部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查是否在项目目录
if [ ! -f "${PROJECT_DIR}/app/main.py" ]; then
    echo -e "${RED}错误: 未找到项目文件，请确认项目路径: ${PROJECT_DIR}${NC}"
    exit 1
fi

cd "${PROJECT_DIR}"

# 1. 检查Python虚拟环境
echo -e "${YELLOW}[1/6] 检查Python虚拟环境...${NC}"
if [ ! -d "${VENV_DIR}" ]; then
    echo "创建Python虚拟环境..."
    python3 -m venv "${VENV_DIR}"
fi

# 激活虚拟环境
source "${VENV_DIR}/bin/activate"

# 2. 安装/更新Python依赖
echo -e "${YELLOW}[2/6] 安装Python依赖...${NC}"
pip install --upgrade pip
pip install -r requirements.txt

# 3. 检查.env文件
echo -e "${YELLOW}[3/6] 检查环境配置...${NC}"
if [ ! -f ".env" ]; then
    echo -e "${RED}警告: 未找到 .env 文件，请手动创建并配置！${NC}"
    echo "参考 .env.example 或 DEPLOY_BT.md 文档"
else
    echo -e "${GREEN}✓ .env 文件已存在${NC}"
fi

# 4. 构建前端 - Admin
echo -e "${YELLOW}[4/6] 构建管理后台...${NC}"
cd "${PROJECT_DIR}/admin"
if [ ! -d "node_modules" ]; then
    echo "安装npm依赖..."
    npm install
fi
npm run build
echo -e "${GREEN}✓ 管理后台构建完成${NC}"

# 5. 构建前端 - Web
echo -e "${YELLOW}[5/6] 构建Web前台...${NC}"
cd "${PROJECT_DIR}/Web"
if [ ! -d "node_modules" ]; then
    echo "安装npm依赖..."
    npm install
fi
npm run build
echo -e "${GREEN}✓ Web前台构建完成${NC}"

# 6. 重启后端服务
echo -e "${YELLOW}[6/6] 重启后端服务...${NC}"
cd "${PROJECT_DIR}"

# 检查PM2是否安装
if command -v pm2 &> /dev/null; then
    # 检查服务是否已存在
    if pm2 list | grep -q "personal-web-api"; then
        echo "重启PM2服务..."
        pm2 restart personal-web-api
    else
        echo "启动PM2服务..."
        # 使用uvicorn
        pm2 start uvicorn --name "personal-web-api" -- \
            --host 0.0.0.0 --port 8000 \
            --app app.main:app \
            --interpreter "${VENV_DIR}/bin/python" \
            --cwd "${PROJECT_DIR}"
        pm2 save
    fi
    echo -e "${GREEN}✓ 后端服务已重启${NC}"
else
    echo -e "${YELLOW}警告: 未安装PM2，请手动启动后端服务${NC}"
    echo "可以使用: source .venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"
fi

# 创建日志目录
mkdir -p "${PROJECT_DIR}/logs"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  部署完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "下一步："
echo "1. 检查 .env 文件配置是否正确"
echo "2. 配置Nginx反向代理（参考 deploy/nginx.conf.example）"
echo "3. 配置SSL证书（HTTPS）"
echo "4. 访问网站检查是否正常运行"
echo ""
echo "查看服务状态: pm2 list"
echo "查看服务日志: pm2 logs personal-web-api"

