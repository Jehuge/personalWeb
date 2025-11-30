#!/bin/bash
# 验证部署是否成功
# 使用方法: bash deploy/verify-deployment.sh

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  部署验证${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 1. 检查后端服务
echo -e "${YELLOW}[1/4] 检查后端服务...${NC}"
if curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo -e "${GREEN}✓ 后端服务运行正常${NC}"
    echo "健康检查响应："
    curl -s http://127.0.0.1:8000/health | python3 -m json.tool 2>/dev/null || curl -s http://127.0.0.1:8000/health
    echo ""
else
    echo -e "${RED}❌ 后端服务无法访问${NC}"
    echo "请检查："
    echo "  - Gunicorn进程是否运行"
    echo "  - 端口8000是否被占用"
    exit 1
fi
echo ""

# 2. 检查API根路径
echo -e "${YELLOW}[2/4] 检查API根路径...${NC}"
if curl -s http://127.0.0.1:8000/ > /dev/null; then
    echo -e "${GREEN}✓ API根路径可访问${NC}"
    echo "API信息："
    curl -s http://127.0.0.1:8000/ | python3 -m json.tool 2>/dev/null || curl -s http://127.0.0.1:8000/
    echo ""
else
    echo -e "${RED}❌ API根路径无法访问${NC}"
fi
echo ""

# 3. 检查静态文件
echo -e "${YELLOW}[3/4] 检查静态文件...${NC}"
WEB_DIST="/www/wwwroot/personal-web/Web/dist"
if [ -d "$WEB_DIST" ] && [ -f "$WEB_DIST/index.html" ]; then
    echo -e "${GREEN}✓ Web前台静态文件已构建${NC}"
    echo "文件路径: $WEB_DIST"
    echo "文件大小: $(du -sh $WEB_DIST | cut -f1)"
else
    echo -e "${RED}❌ Web前台静态文件未找到${NC}"
    echo "需要构建："
    echo "  cd /www/wwwroot/personal-web/Web"
    echo "  npm run build"
fi
echo ""

ADMIN_DIST="/www/wwwroot/personal-web/admin/dist"
if [ -d "$ADMIN_DIST" ] && [ -f "$ADMIN_DIST/index.html" ]; then
    echo -e "${GREEN}✓ 管理后台静态文件已构建${NC}"
else
    echo -e "${YELLOW}⚠️  管理后台静态文件未找到（可选）${NC}"
fi
echo ""

# 4. 检查Nginx配置
echo -e "${YELLOW}[4/4] 检查Nginx配置...${NC}"
if command -v nginx &> /dev/null; then
    if nginx -t 2>&1 | grep -q "successful"; then
        echo -e "${GREEN}✓ Nginx配置正确${NC}"
    else
        echo -e "${RED}❌ Nginx配置有错误${NC}"
        nginx -t
    fi
else
    echo -e "${YELLOW}⚠️  未找到nginx命令${NC}"
fi
echo ""

# 总结
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  验证总结${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "后端服务状态："
if curl -s http://127.0.0.1:8000/health > /dev/null; then
    echo -e "${GREEN}✓ 后端服务正常运行在 http://127.0.0.1:8000${NC}"
else
    echo -e "${RED}❌ 后端服务异常${NC}"
fi
echo ""
echo "下一步："
echo "  1. 确认静态文件已构建（Web/dist 和 admin/dist）"
echo "  2. 检查Nginx配置是否正确"
echo "  3. 访问网站测试："
echo "     - 主站: http://你的域名.com"
echo "     - API: http://你的域名.com/api/health"
echo "     - 管理后台: http://admin.你的域名.com"
echo ""
echo "如果仍有500错误，请检查："
echo "  - Nginx错误日志: tail -50 /www/wwwlogs/error.log"
echo "  - 后端日志: pm2 logs 或查看Gunicorn日志"
echo "  - 文件权限: ls -la /www/wwwroot/personal-web/Web/dist"
echo ""

