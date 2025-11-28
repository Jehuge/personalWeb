#!/bin/bash

# 启动后端服务脚本

echo "正在启动后端服务..."

# 检查.env文件
if [ ! -f ".env" ]; then
    echo "警告: .env 文件不存在，请检查配置"
fi

# 启动服务
echo "启动FastAPI服务..."
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000




