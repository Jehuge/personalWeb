#!/bin/bash
# 修复pip镜像源问题 - 使用官方PyPI源安装依赖
# 使用方法: bash deploy/fix-pip-source.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  修复pip镜像源问题${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查是否在项目目录
if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}错误: 未找到 requirements.txt，请在项目根目录执行${NC}"
    exit 1
fi

# 检查虚拟环境
if [ -z "$VIRTUAL_ENV" ]; then
    if [ -d ".venv" ]; then
        echo "激活虚拟环境..."
        source .venv/bin/activate
    else
        echo -e "${YELLOW}警告: 未检测到虚拟环境，建议先创建虚拟环境${NC}"
    fi
fi

echo -e "${YELLOW}[1/3] 升级pip到最新版本...${NC}"
pip install --upgrade pip -i https://pypi.org/simple

echo -e "${YELLOW}[2/3] 使用官方PyPI源安装依赖...${NC}"
echo "这可能需要一些时间，请耐心等待..."
pip install -i https://pypi.org/simple -r requirements.txt

echo -e "${YELLOW}[3/3] 验证安装...${NC}"
python3 -c "import fastapi; print(f'FastAPI版本: {fastapi.__version__}')" || {
    echo -e "${RED}安装验证失败${NC}"
    exit 1
}

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  安装完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "提示：如果以后还想使用官方源，可以："
echo "  pip install -i https://pypi.org/simple <包名>"
echo ""
echo "或者临时配置："
echo "  pip install -i https://pypi.org/simple -r requirements.txt"
echo ""


