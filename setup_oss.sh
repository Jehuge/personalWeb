#!/bin/bash

echo "=== 阿里云OSS配置向导 ==="
echo ""

read -p "请输入OSS_ACCESS_KEY_ID: " ACCESS_KEY_ID
read -p "请输入OSS_ACCESS_KEY_SECRET: " ACCESS_KEY_SECRET
read -p "请输入OSS_ENDPOINT (例如: oss-cn-hangzhou.aliyuncs.com): " ENDPOINT
read -p "请输入OSS_BUCKET_NAME: " BUCKET_NAME
read -p "请输入OSS_BASE_URL (CDN域名，可选，直接回车跳过): " BASE_URL

# 检查.env文件是否存在
if [ ! -f .env ]; then
    echo "创建 .env 文件..."
    touch .env
fi

# 删除旧的OSS配置
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' '/^OSS_/d' .env
else
    # Linux
    sed -i '/^OSS_/d' .env
fi

# 添加新的OSS配置
cat >> .env << EOL

# OSS配置
OSS_ACCESS_KEY_ID=$ACCESS_KEY_ID
OSS_ACCESS_KEY_SECRET=$ACCESS_KEY_SECRET
OSS_ENDPOINT=$ENDPOINT
OSS_BUCKET_NAME=$BUCKET_NAME
EOL

if [ ! -z "$BASE_URL" ]; then
    echo "OSS_BASE_URL=$BASE_URL" >> .env
fi

echo ""
echo "✅ OSS配置已更新到 .env 文件"
echo ""
echo "配置信息："
echo "  AccessKey ID: $ACCESS_KEY_ID"
echo "  Endpoint: $ENDPOINT"
echo "  Bucket: $BUCKET_NAME"
if [ ! -z "$BASE_URL" ]; then
    echo "  CDN域名: $BASE_URL"
fi
echo ""
echo "⚠️  请重启后端服务使配置生效"
echo "   命令: pkill -f uvicorn && python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
