#!/bin/bash
set -e

# 启动 FastAPI 后端脚本 (端口: 8000)
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8000
HOST=0.0.0.0

echo "👉 正在启动 FastAPI 后端，端口 ${PORT}"
cd "${ROOT_DIR}"

if [ ! -f ".env" ]; then
    echo "⚠️  警告: 根目录未发现 .env 文件，请确认数据库/OSS 配置是否已写入。"
fi

echo "🚀 启动 Uvicorn..."
exec python3 -m uvicorn app.main:app --reload --host "${HOST}" --port "${PORT}"




