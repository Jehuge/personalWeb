"""
首页API路由
用于获取首页展示数据
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import random

from app.core.database import get_db
from app.core.anti_crawler import limiter
from app.core.config import settings
from app.models.blog import Blog
from app.models.photo import Photo
from app.models.ai_demo import AIDemo
from app.models.ai_project import AIProject
from app.models.ai_image import AIImage
from app.schemas.blog import Blog as BlogSchema
from app.schemas.photo import Photo as PhotoSchema
from app.schemas.ai_demo import AIDemo as AIDemoSchema
from app.schemas.ai_image import AIImage as AIImageSchema
from app.schemas.ai_project import AIProject as AIProjectSchema

router = APIRouter(prefix="/home", tags=["首页"])


class HomeOverviewResponse(BaseModel):
    blogs: List[BlogSchema]
    photos: List[PhotoSchema]
    ai_images: List[AIImageSchema]
    ai_demos: List[AIDemoSchema]
    ai_projects: List[AIProjectSchema]
    stats: Dict[str, int]


@router.get("/overview", response_model=HomeOverviewResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def get_home_overview(
    request: Request,
    blog_limit: int = Query(6, ge=1, le=20, description="博客数量"),
    photo_limit: int = Query(10, ge=1, le=20, description="随机图片数量"),
    ai_image_limit: int = Query(10, ge=1, le=20, description="AI图片数量"),
    ai_demo_limit: int = Query(4, ge=1, le=10, description="AI Demo数量"),
    ai_project_limit: int = Query(4, ge=1, le=10, description="AI项目数量"),
    db: AsyncSession = Depends(get_db)
):
    """获取首页概览数据"""
    try:
        # 获取最新发布的博客
        blog_query = select(Blog).options(
            selectinload(Blog.category),
            selectinload(Blog.tags)
        ).where(Blog.is_published == True)  # noqa: E712
        # 按created_at排序（已发布的文章通常published_at也会有值，但为兼容性使用created_at）
        blog_query = blog_query.order_by(Blog.created_at.desc()).limit(blog_limit)
        blog_result = await db.execute(blog_query)
        blogs = blog_result.scalars().unique().all()
        
        # 获取随机图片
        photo_count_query = select(func.count(Photo.id))
        photo_count_result = await db.execute(photo_count_query)
        total_photos = photo_count_result.scalar() or 0
        
        photos = []
        if total_photos > 0:
            # 随机选择图片
            random_offset = random.randint(0, max(0, total_photos - photo_limit))
            photo_query = select(Photo).options(selectinload(Photo.category)).offset(random_offset).limit(photo_limit)
            photo_result = await db.execute(photo_query)
            photos = list(photo_result.scalars().all())
            # 打乱顺序
            random.shuffle(photos)
        
        # 获取已发布的AI图片（随机选择，排除 nsfw 标签）
        # 排除 tags 包含 nsfw 的图片
        ai_image_count_query = select(func.count(AIImage.id)).where(
            AIImage.is_published == True,  # noqa: E712
            or_(
                AIImage.tags.is_(None),
                AIImage.tags == "",
                ~AIImage.tags.contains("nsfw")
            )
        )
        ai_image_count_result = await db.execute(ai_image_count_query)
        total_ai_images = ai_image_count_result.scalar() or 0
        
        ai_images = []
        if total_ai_images > 0:
            random_offset = random.randint(0, max(0, total_ai_images - ai_image_limit))
            ai_image_query = select(AIImage).where(
                AIImage.is_published == True,  # noqa: E712
                or_(
                    AIImage.tags.is_(None),
                    AIImage.tags == "",
                    ~AIImage.tags.contains("nsfw")
                )
            ).offset(random_offset).limit(ai_image_limit)
            ai_image_result = await db.execute(ai_image_query)
            ai_images = list(ai_image_result.scalars().all())
            random.shuffle(ai_images)
        
        # 获取已发布的AI Demo（优先显示精选）
        ai_demo_query = select(AIDemo).where(AIDemo.is_published == True)  # noqa: E712
        ai_demo_query = ai_demo_query.order_by(AIDemo.is_featured.desc(), AIDemo.sort_order.asc(), AIDemo.created_at.desc()).limit(ai_demo_limit)
        ai_demo_result = await db.execute(ai_demo_query)
        ai_demos = ai_demo_result.scalars().all()
        
        # 获取已发布的AI项目（优先显示精选）
        ai_project_query = select(AIProject).where(AIProject.is_published == True)  # noqa: E712
        ai_project_query = ai_project_query.order_by(AIProject.is_featured.desc(), AIProject.created_at.desc()).limit(ai_project_limit)
        ai_project_result = await db.execute(ai_project_query)
        ai_projects = ai_project_result.scalars().all()
        
        # 统计数据 - 统计总数
        # 博客数量：已发布的博客总数
        total_blog_count_query = select(func.count(Blog.id)).where(Blog.is_published == True)  # noqa: E712
        total_blog_count_result = await db.execute(total_blog_count_query)
        blog_count = total_blog_count_result.scalar() or 0
        
        # 图片数量：所有图片总数（Photo 没有 is_published 字段，统计所有）
        total_photo_count_query = select(func.count(Photo.id))
        total_photo_count_result = await db.execute(total_photo_count_query)
        photo_count = total_photo_count_result.scalar() or 0
        
        # AI 图库数量：已发布的 AI 图片总数
        total_ai_image_count_query = select(func.count(AIImage.id)).where(AIImage.is_published == True)  # noqa: E712
        total_ai_image_count_result = await db.execute(total_ai_image_count_query)
        ai_image_count = total_ai_image_count_result.scalar() or 0
        
        # AI Demo 数量：已发布的 AIDemo 总数
        total_ai_demo_count_query = select(func.count(AIDemo.id)).where(AIDemo.is_published == True)  # noqa: E712
        total_ai_demo_count_result = await db.execute(total_ai_demo_count_query)
        ai_demo_count = total_ai_demo_count_result.scalar() or 0
        
        # 个人项目数量：已发布的 AIProject 总数
        total_ai_project_count_query = select(func.count(AIProject.id)).where(AIProject.is_published == True)  # noqa: E712
        total_ai_project_count_result = await db.execute(total_ai_project_count_query)
        ai_project_count = total_ai_project_count_result.scalar() or 0
        
        # 构建stats字典
        stats_dict = {
            "blog_count": blog_count,
            "photo_count": photo_count,
            "ai_image_count": ai_image_count,
            "ai_demo_count": ai_demo_count,
            "ai_project_count": ai_project_count,
        }
        
        return HomeOverviewResponse(
            blogs=blogs,
            photos=photos,
            ai_images=ai_images,
            ai_demos=ai_demos,
            ai_projects=ai_projects,
            stats=stats_dict
        )
    except Exception as e:
        import traceback
        print(f"Error in get_home_overview: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取首页数据失败: {str(e)}"
        )


@router.get("/random-photos", response_model=List[PhotoSchema])
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def get_random_photos(
    request: Request,
    limit: int = Query(8, ge=1, le=20, description="随机图片数量"),
    db: AsyncSession = Depends(get_db)
):
    """获取随机图片"""
    try:
        photo_count_query = select(func.count(Photo.id))
        photo_count_result = await db.execute(photo_count_query)
        total_photos = photo_count_result.scalar() or 0
        
        if total_photos == 0:
            return []
        
        # 随机选择图片
        random_offset = random.randint(0, max(0, total_photos - limit))
        photo_query = select(Photo).options(selectinload(Photo.category)).offset(random_offset).limit(limit)
        photo_result = await db.execute(photo_query)
        photos = list(photo_result.scalars().all())
        random.shuffle(photos)
        
        return photos
    except Exception as e:
        import traceback
        print(f"Error in get_random_photos: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取随机图片失败: {str(e)}"
        )

