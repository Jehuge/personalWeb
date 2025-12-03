"""
FastAPI主应用文件
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth
from app.api import blog, photo, ai_project, upload, user, media, ai_demo, ai_image, home

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="个人综合展示网站API",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
