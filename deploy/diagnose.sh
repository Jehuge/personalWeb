#!/bin/bash
# 快速诊断脚本 - 检查部署环境
# 使用方法: bash deploy/diagnose.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  部署环境诊断${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 检查当前目录
echo -e "${YELLOW}[1/6] 检查当前目录...${NC}"
CURRENT_DIR=$(pwd)
echo "当前目录: $CURRENT_DIR"

if [ ! -f "requirements.txt" ]; then
    echo -e "${RED}❌ 未找到 requirements.txt${NC}"
    echo "请确认："
    echo "  1. 是否在项目根目录？"
    echo "  2. 项目文件是否完整上传？"
    echo ""
    echo "正确的项目目录应该包含："
    echo "  - app/"
    echo "  - admin/"
    echo "  - Web/"
    echo "  - requirements.txt"
    echo ""
    echo "请切换到项目根目录："
    echo "  cd /www/wwwroot/personal-web/"
    exit 1
else
    echo -e "${GREEN}✓ 找到 requirements.txt${NC}"
fi
echo ""

# 2. 检查Python版本
echo -e "${YELLOW}[2/6] 检查Python版本...${NC}"
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1)
    echo "Python版本: $PYTHON_VERSION"
    
    PYTHON_MAJOR=$(python3 -c "import sys; print(sys.version_info.major)")
    PYTHON_MINOR=$(python3 -c "import sys; print(sys.version_info.minor)")
    
    if [ "$PYTHON_MAJOR" -lt 3 ] || ([ "$PYTHON_MAJOR" -eq 3 ] && [ "$PYTHON_MINOR" -lt 8 ]); then
        echo -e "${RED}❌ Python版本过低！需要3.8+（推荐3.11+）${NC}"
        echo ""
        echo "解决方案："
        echo "  1. 在宝塔面板「软件商店」安装Python 3.11+"
        echo "  2. 或运行: bash deploy/install-python311.sh"
        echo ""
        PYTHON_OK=false
    else
        echo -e "${GREEN}✓ Python版本符合要求${NC}"
        PYTHON_OK=true
    fi
else
    echo -e "${RED}❌ 未找到python3${NC}"
    PYTHON_OK=false
fi
echo ""

# 3. 检查是否有Python 3.11
echo -e "${YELLOW}[3/6] 检查是否有Python 3.11...${NC}"
if command -v python3.11 &> /dev/null; then
    PYTHON311_VERSION=$(python3.11 --version 2>&1)
    echo -e "${GREEN}✓ 找到 $PYTHON311_VERSION${NC}"
    echo "建议使用: python3.11 -m venv .venv"
    HAS_PYTHON311=true
else
    echo -e "${YELLOW}⚠️  未找到Python 3.11（可选，但推荐）${NC}"
    HAS_PYTHON311=false
fi
echo ""

# 4. 检查虚拟环境
echo -e "${YELLOW}[4/6] 检查虚拟环境...${NC}"
if [ -d ".venv" ]; then
    echo -e "${GREEN}✓ 找到虚拟环境 .venv${NC}"
    if [ -f ".venv/bin/activate" ]; then
        echo -e "${GREEN}✓ 虚拟环境可激活${NC}"
    fi
    
    # 检查虚拟环境的Python版本
    if [ -f ".venv/bin/python" ]; then
        VENV_PYTHON=$(.venv/bin/python --version 2>&1)
        echo "虚拟环境Python版本: $VENV_PYTHON"
    fi
else
    echo -e "${YELLOW}⚠️  未找到虚拟环境${NC}"
    echo "需要创建虚拟环境"
fi
echo ""

# 5. 检查pip
echo -e "${YELLOW}[5/6] 检查pip...${NC}"
if command -v pip3 &> /dev/null; then
    PIP_VERSION=$(pip3 --version 2>&1)
    echo "pip版本: $PIP_VERSION"
    echo -e "${GREEN}✓ pip可用${NC}"
else
    echo -e "${RED}❌ 未找到pip3${NC}"
fi
echo ""

# 6. 检查项目文件
echo -e "${YELLOW}[6/6] 检查项目文件...${NC}"
FILES_TO_CHECK=("app/main.py" "admin/package.json" "Web/package.json" ".env")
for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓ $file${NC}"
    else
        if [ "$file" = ".env" ]; then
            echo -e "${YELLOW}⚠️  $file (需要创建)${NC}"
        else
            echo -e "${RED}❌ $file (缺失)${NC}"
        fi
    fi
done
echo ""

# 总结和建议
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  诊断总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$PYTHON_OK" = false ]; then
    echo -e "${RED}需要先升级Python版本！${NC}"
    echo ""
    echo "推荐操作："
    echo "  1. 在宝塔面板安装Python 3.11+"
    echo "  2. 然后运行: bash deploy/install-python311.sh"
    echo "  3. 重新创建虚拟环境: python3.11 -m venv .venv"
    exit 1
fi

echo -e "${GREEN}环境检查完成！${NC}"
echo ""
echo "下一步操作："
echo ""

if [ ! -d ".venv" ]; then
    if [ "$HAS_PYTHON311" = true ]; then
        echo "  1. 创建虚拟环境:"
        echo "     python3.11 -m venv .venv"
    else
        echo "  1. 创建虚拟环境:"
        echo "     python3 -m venv .venv"
    fi
    echo "  2. 激活虚拟环境:"
    echo "     source .venv/bin/activate"
    echo "  3. 安装依赖:"
    echo "     pip install --upgrade pip -i https://pypi.org/simple"
    echo "     pip install -i https://pypi.org/simple -r requirements.txt"
else
    echo "  1. 激活虚拟环境:"
    echo "     source .venv/bin/activate"
    echo "  2. 安装依赖:"
    echo "     pip install --upgrade pip -i https://pypi.org/simple"
    echo "     pip install -i https://pypi.org/simple -r requirements.txt"
fi

if [ ! -f ".env" ]; then
    echo "  3. 创建.env文件:"
    echo "     cp deploy/.env.example .env"
    echo "     nano .env  # 编辑配置"
fi

echo ""


