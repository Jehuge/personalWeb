#!/bin/bash
# 检查Python版本脚本
# 使用方法: bash deploy/check-python-version.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Python版本检查${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查Python版本
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
PYTHON_MAJOR=$(echo $PYTHON_VERSION | cut -d. -f1)
PYTHON_MINOR=$(echo $PYTHON_VERSION | cut -d. -f2)

echo "当前Python版本: $PYTHON_VERSION"

# 检查版本是否符合要求（需要3.8+，推荐3.11+）
if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
    echo -e "${RED}❌ Python版本过低！${NC}"
    echo -e "${RED}项目需要Python 3.8+（推荐3.11+）${NC}"
    echo ""
    echo -e "${YELLOW}解决方案：${NC}"
    echo "1. 在宝塔面板安装Python 3.11+"
    echo "2. 或使用以下命令安装（CentOS）："
    echo ""
    echo "   # 安装Python 3.11"
    echo "   yum install -y python311 python311-pip"
    echo ""
    echo "   # 创建软链接（可选）"
    echo "   ln -sf /usr/bin/python3.11 /usr/bin/python3"
    echo ""
    exit 1
elif [ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 11 ]; then
    echo -e "${YELLOW}⚠️  Python版本可用但非推荐版本${NC}"
    echo -e "${YELLOW}推荐使用Python 3.11+以获得最佳性能${NC}"
else
    echo -e "${GREEN}✓ Python版本符合要求${NC}"
fi

# 检查pip
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version | awk '{print $2}')
    echo "当前pip版本: $PIP_VERSION"
else
    echo -e "${RED}❌ 未找到pip3${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}检查完成！${NC}"







