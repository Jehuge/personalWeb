#!/bin/bash
# 在CentOS/RHEL系统安装Python 3.11
# 使用方法: bash deploy/install-python311.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  安装Python 3.11${NC}"
echo -e "${GREEN}========================================${NC}"

# 检测系统类型
if [ -f /etc/redhat-release ]; then
    OS="centos"
    echo "检测到CentOS/RHEL系统"
elif [ -f /etc/debian_version ]; then
    OS="debian"
    echo "检测到Debian/Ubuntu系统"
else
    echo -e "${RED}未识别的系统类型${NC}"
    exit 1
fi

if [ "$OS" = "centos" ]; then
    echo -e "${YELLOW}[1/4] 安装EPEL和开发工具...${NC}"
    yum install -y epel-release
    yum groupinstall -y "Development Tools"
    yum install -y openssl-devel bzip2-devel libffi-devel zlib-devel readline-devel sqlite-devel
    
    echo -e "${YELLOW}[2/4] 下载Python 3.11源码...${NC}"
    cd /tmp
    if [ ! -f "Python-3.11.9.tgz" ]; then
        wget https://www.python.org/ftp/python/3.11.9/Python-3.11.9.tgz
    fi
    tar -xzf Python-3.11.9.tgz
    cd Python-3.11.9
    
    echo -e "${YELLOW}[3/4] 编译安装Python 3.11...${NC}"
    ./configure --enable-optimizations --prefix=/usr/local/python311
    make -j$(nproc)
    make altinstall
    
    echo -e "${YELLOW}[4/4] 创建软链接...${NC}"
    ln -sf /usr/local/python311/bin/python3.11 /usr/local/bin/python3.11
    ln -sf /usr/local/python311/bin/pip3.11 /usr/local/bin/pip3.11
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Python 3.11安装完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "使用Python 3.11："
    echo "  python3.11 --version"
    echo ""
    echo "创建虚拟环境："
    echo "  python3.11 -m venv .venv"
    echo ""
    
elif [ "$OS" = "debian" ]; then
    echo -e "${YELLOW}[1/3] 更新软件包列表...${NC}"
    apt-get update
    
    echo -e "${YELLOW}[2/3] 安装Python 3.11...${NC}"
    apt-get install -y software-properties-common
    add-apt-repository -y ppa:deadsnakes/ppa
    apt-get update
    apt-get install -y python3.11 python3.11-venv python3.11-dev
    
    echo -e "${YELLOW}[3/3] 安装pip...${NC}"
    apt-get install -y python3.11-pip
    
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  Python 3.11安装完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "使用Python 3.11："
    echo "  python3.11 --version"
    echo ""
    echo "创建虚拟环境："
    echo "  python3.11 -m venv .venv"
    echo ""
fi







