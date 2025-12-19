"""
FastAPI主应用文件
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from app.core.config import settings
from app.core.anti_crawler import (
    limiter,
    check_user_agent_middleware,
    get_rate_limit_key
)
from app.api import auth
from app.api import blog, photo, ai_project, upload, user, media, ai_demo, ai_image, home, video

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="个人综合展示网站API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置速率限制器
limiter.key_func = get_rate_limit_key
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 添加速率限制中间件（如果启用）
if settings.ENABLE_RATE_LIMIT:
    app.add_middleware(SlowAPIMiddleware)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加User-Agent检查中间件（如果启用）
if settings.ENABLE_USER_AGENT_CHECK:
    @app.middleware("http")
    async def user_agent_check_middleware(request: Request, call_next):
        return await check_user_agent_middleware(request, call_next)

# 注册路由
app.include_router(auth.router, prefix="/api")
app.include_router(blog.router, prefix="/api")
app.include_router(photo.router, prefix="/api")
app.include_router(ai_project.router, prefix="/api")
app.include_router(upload.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(media.router, prefix="/api")
app.include_router(ai_demo.router, prefix="/api")
app.include_router(ai_image.router, prefix="/api")
app.include_router(home.router, prefix="/api")
app.include_router(video.router, prefix="/api")


@app.get("/")
async def root():
    """根路径"""
    return {
        "message": "个人综合展示网站API",
        "version": settings.APP_VERSION,
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}
