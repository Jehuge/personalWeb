#!/bin/bash
# Nginx 500错误排查脚本
# 使用方法: bash deploy/troubleshoot-nginx.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Nginx 500错误排查${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 检查后端服务是否运行
echo -e "${YELLOW}[1/5] 检查后端服务状态...${NC}"
if command -v pm2 &> /dev/null; then
    echo "PM2进程列表："
    pm2 list
    echo ""
    
    if pm2 list | grep -q "personal-web-api"; then
        echo -e "${GREEN}✓ 后端服务正在运行${NC}"
        echo "查看后端日志："
        pm2 logs personal-web-api --lines 20 --nostream
    else
        echo -e "${RED}❌ 后端服务未运行${NC}"
        echo "启动后端服务："
        echo "  cd /www/wwwroot/personal-web/"
        echo "  source .venv/bin/activate"
        echo "  pm2 start uvicorn --name personal-web-api -- --host 0.0.0.0 --port 8000 app.main:app"
    fi
else
    echo -e "${YELLOW}⚠️  未安装PM2，检查端口8000...${NC}"
    if netstat -tlnp 2>/dev/null | grep -q ":8000" || ss -tlnp 2>/dev/null | grep -q ":8000"; then
        echo -e "${GREEN}✓ 端口8000正在监听${NC}"
    else
        echo -e "${RED}❌ 端口8000未监听，后端服务可能未启动${NC}"
    fi
fi
echo ""

# 2. 测试后端API
echo -e "${YELLOW}[2/5] 测试后端API...${NC}"
if curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo -e "${GREEN}✓ 后端API可访问${NC}"
    echo "健康检查响应："
    curl -s http://127.0.0.1:8000/health | head -c 200
    echo ""
else
    echo -e "${RED}❌ 后端API无法访问${NC}"
    echo "请检查后端服务是否启动"
fi
echo ""

# 3. 检查静态文件
echo -e "${YELLOW}[3/5] 检查静态文件...${NC}"
WEB_DIST="/www/wwwroot/personal-web/Web/dist"
if [ -d "$WEB_DIST" ]; then
    echo -e "${GREEN}✓ 找到Web/dist目录${NC}"
    if [ -f "$WEB_DIST/index.html" ]; then
        echo -e "${GREEN}✓ 找到index.html${NC}"
        echo "文件大小: $(du -sh $WEB_DIST | cut -f1)"
    else
        echo -e "${RED}❌ 未找到index.html${NC}"
        echo "需要构建前端："
        echo "  cd /www/wwwroot/personal-web/Web"
        echo "  npm run build"
    fi
else
    echo -e "${RED}❌ 未找到Web/dist目录${NC}"
    echo "需要构建前端："
    echo "  cd /www/wwwroot/personal-web/Web"
    echo "  npm run build"
fi
echo ""

# 4. 检查文件权限
echo -e "${YELLOW}[4/5] 检查文件权限...${NC}"
if [ -d "$WEB_DIST" ]; then
    PERM=$(stat -c "%a" "$WEB_DIST" 2>/dev/null || stat -f "%OLp" "$WEB_DIST" 2>/dev/null)
    echo "Web/dist权限: $PERM"
    
    # 检查Nginx用户
    NGINX_USER=$(ps aux | grep nginx | grep -v grep | head -1 | awk '{print $1}')
    if [ -n "$NGINX_USER" ]; then
        echo "Nginx运行用户: $NGINX_USER"
    fi
fi
echo ""

# 5. 检查Nginx错误日志
echo -e "${YELLOW}[5/5] 检查Nginx错误日志...${NC}"
NGINX_ERROR_LOG="/www/wwwlogs/error.log"
if [ -f "$NGINX_ERROR_LOG" ]; then
    echo "最近的错误日志（最后20行）："
    tail -20 "$NGINX_ERROR_LOG"
else
    echo -e "${YELLOW}⚠️  未找到错误日志文件${NC}"
    echo "常见位置："
    echo "  /www/wwwlogs/error.log"
    echo "  /var/log/nginx/error.log"
    echo "  /usr/local/nginx/logs/error.log"
fi
echo ""

# 总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  排查总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "常见500错误原因："
echo "  1. 后端服务未启动 → 启动后端服务"
echo "  2. 静态文件未构建 → 运行 npm run build"
echo "  3. 文件权限问题 → 检查文件权限"
echo "  4. Nginx配置错误 → 检查配置文件"
echo ""
echo "快速修复命令："
echo "  # 启动后端"
echo "  cd /www/wwwroot/personal-web/"
echo "  source .venv/bin/activate"
echo "  pm2 start uvicorn --name personal-web-api -- --host 0.0.0.0 --port 8000 app.main:app"
echo ""
echo "  # 构建前端"
echo "  cd /www/wwwroot/personal-web/Web && npm run build"
echo "  cd /www/wwwroot/personal-web/admin && npm run build"
echo ""
echo "  # 重启Nginx"
echo "  nginx -t  # 测试配置"
echo "  systemctl reload nginx  # 或: service nginx reload"
echo ""







