"""
首页API路由
用于获取首页展示数据
"""
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import random

from app.core.database import get_db
from app.models.blog import Blog
from app.models.photo import Photo
from app.models.ai_project import AIProject
from app.schemas.blog import Blog as BlogSchema
from app.schemas.photo import Photo as PhotoSchema
from app.schemas.ai_project import AIProject as AIProjectSchema

router = APIRouter(prefix="/home", tags=["首页"])


class HomeOverviewResponse(BaseModel):
    blogs: List[BlogSchema]
    photos: List[PhotoSchema]
    projects: List[AIProjectSchema]
    stats: Dict[str, int]


@router.get("/overview", response_model=HomeOverviewResponse)
async def get_home_overview(
    blog_limit: int = Query(6, ge=1, le=20, description="博客数量"),
    photo_limit: int = Query(8, ge=1, le=20, description="随机图片数量"),
    project_limit: int = Query(4, ge=1, le=10, description="AI项目数量"),
    db: AsyncSession = Depends(get_db)
):
    """获取首页概览数据"""
    try:
        # 获取最新发布的博客
        blog_query = select(Blog).options(
            selectinload(Blog.category),
            selectinload(Blog.tags)
        ).where(Blog.is_published == True)
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
        
        # 获取已发布的AI项目（优先显示精选）
        project_query = select(AIProject).where(AIProject.is_published == True)
        project_query = project_query.order_by(AIProject.is_featured.desc(), AIProject.created_at.desc()).limit(project_limit)
        project_result = await db.execute(project_query)
        projects = project_result.scalars().all()
        
        # 统计数据 - 使用实际返回的数据长度，更准确
        blog_count = len(blogs) if blogs else 0
        photo_count = len(photos) if photos else 0
        project_count = len(projects) if projects else 0
        
        # 如果需要显示总数而不是当前返回的数量，可以使用以下查询
        # 但为了准确性，我们使用实际返回的数据数量
        total_blog_count_query = select(func.count(Blog.id)).where(Blog.is_published == True)
        total_blog_count_result = await db.execute(total_blog_count_query)
        total_blog_count = total_blog_count_result.scalar() or 0
        
        total_photo_count_query = select(func.count(Photo.id))
        total_photo_count_result = await db.execute(total_photo_count_query)
        total_photo_count = total_photo_count_result.scalar() or 0
        
        total_project_count_query = select(func.count(AIProject.id)).where(AIProject.is_published == True)
        total_project_count_result = await db.execute(total_project_count_query)
        total_project_count = total_project_count_result.scalar() or 0
        
        # 使用总数而不是当前返回的数量
        blog_count = total_blog_count
        photo_count = total_photo_count
        project_count = total_project_count
        
        return HomeOverviewResponse(
            blogs=blogs,
            photos=photos,
            projects=projects,
            stats={
                "blog_count": blog_count,
                "photo_count": photo_count,
                "project_count": project_count,
            }
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
async def get_random_photos(
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

