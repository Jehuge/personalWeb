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

# 1. 检查Python版本和虚拟环境
echo -e "${YELLOW}[1/6] 检查Python版本...${NC}"
PYTHON_CMD="python3"

# 检查是否有python3.11
if command -v python3.11 &> /dev/null; then
    PYTHON_VERSION=$(python3.11 --version 2>&1 | awk '{print $2}')
    PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
    PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)
    if [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -ge 8 ]; then
        PYTHON_CMD="python3.11"
        echo "使用Python 3.11"
    fi
fi

# 检查Python版本是否符合要求
PYTHON_VERSION=$(${PYTHON_CMD} --version 2>&1 | awk '{print $2}')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo -e "${RED}错误: Python版本过低！当前版本: $PYTHON_VERSION${NC}"
    echo -e "${RED}项目需要Python 3.8+（推荐3.11+）${NC}"
    echo ""
    echo "解决方案："
    echo "1. 在宝塔面板安装Python 3.11+"
    echo "2. 或运行: bash deploy/install-python311.sh"
    exit 1
fi

echo "Python版本: $PYTHON_VERSION"

echo -e "${YELLOW}创建Python虚拟环境...${NC}"
if [ ! -d "${VENV_DIR}" ]; then
    ${PYTHON_CMD} -m venv "${VENV_DIR}"
fi

# 激活虚拟环境
source "${VENV_DIR}/bin/activate"

# 2. 安装/更新Python依赖
echo -e "${YELLOW}[2/6] 安装Python依赖...${NC}"
pip install --upgrade pip

# 尝试使用官方源安装（解决镜像源版本问题）
echo "尝试使用官方PyPI源安装依赖..."
if ! pip install -i https://pypi.org/simple -r requirements.txt 2>/dev/null; then
    echo -e "${YELLOW}官方源安装失败，尝试使用兼容版本...${NC}"
    if [ -f "requirements-compatible.txt" ]; then
        pip install -r requirements-compatible.txt
    else
        echo -e "${RED}安装失败，请手动检查依赖${NC}"
        exit 1
    fi
fi

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

