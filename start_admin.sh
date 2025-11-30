#!/bin/bash
set -e

# 启动管理界面脚本 (端口: 3001)
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ADMIN_DIR="${ROOT_DIR}/admin"
PORT=3000
HOST=0.0.0.0

echo "👉 正在启动管理界面 (admin) ，端口 ${PORT}"
cd "${ADMIN_DIR}"

if [ ! -d "node_modules" ]; then
  echo "📦 未检测到 node_modules，正在安装依赖..."
  npm install
fi

echo "🚀 启动 Vite 开发服务器..."
exec npm run dev -- --port "${PORT}" --host "${HOST}"




