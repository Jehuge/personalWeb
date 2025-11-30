#!/bin/bash
set -e

# 启动前台展示 Web (端口: 3000)
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
WEB_DIR="${ROOT_DIR}/Web"
PORT=3001
HOST=0.0.0.0

echo "👉 正在启动 Web 前台，端口 ${PORT}"
cd "${WEB_DIR}"

if [ ! -d "node_modules" ]; then
  echo "📦 未检测到 node_modules，正在安装依赖..."
  npm install
fi

echo "🚀 启动 Vite 开发服务器..."
exec npm run dev -- --port "${PORT}" --host "${HOST}"

