"""
媒体资源管理API路由
用于管理OSS上的所有资源
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.core.database import get_db
from app.core.config import settings
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.models.blog import Blog
from app.models.photo import Photo
from app.models.ai_project import AIProject
from app.utils.oss import oss_service

router = APIRouter(prefix="/media", tags=["媒体资源管理"])


@router.get("/stats")
async def get_media_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取媒体资源统计信息"""
    # 统计博客封面图
    blog_result = await db.execute(
        select(func.count(Blog.id)).where(Blog.cover_image.isnot(None))
    )
    blog_count = blog_result.scalar() or 0
    
    # 统计摄影作品
    photo_result = await db.execute(select(func.count(Photo.id)))
    photo_count = photo_result.scalar() or 0
    
    # 统计AI项目封面图
    ai_result = await db.execute(
        select(func.count(AIProject.id)).where(AIProject.cover_image.isnot(None))
    )
    ai_count = ai_result.scalar() or 0
    
    return {
        "blog_covers": blog_count,
        "photos": photo_count,
        "ai_covers": ai_count,
        "total": blog_count + photo_count + ai_count
    }


@router.get("")
async def get_media_list(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    media_type: Optional[str] = Query(None, description="资源类型: blog_cover, photo, ai_cover"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取媒体资源列表"""
    media_list: List[Dict[str, Any]] = []
    
    # 获取博客封面图
    if not media_type or media_type == "blog_cover":
        blog_result = await db.execute(
            select(Blog.id, Blog.title, Blog.cover_image, Blog.created_at)
            .where(Blog.cover_image.isnot(None))
            .order_by(Blog.created_at.desc())
            .offset(skip if not media_type else 0)
            .limit(limit if not media_type else limit // 3)
        )
        for row in blog_result.all():
            media_list.append({
                "id": f"blog_{row.id}",
                "type": "blog_cover",
                "title": row.title,
                "url": row.cover_image,
                "thumbnail_url": row.cover_image,
                "related_id": row.id,
                "related_type": "blog",
                "created_at": row.created_at.isoformat() if row.created_at else None,
            })
    
    # 获取摄影作品
    if not media_type or media_type == "photo":
        photo_result = await db.execute(
            select(
                Photo.id,
                Photo.title,
                Photo.image_url,
                Photo.thumbnail_url,
                Photo.file_size,
                Photo.width,
                Photo.height,
                Photo.created_at
            )
            .order_by(Photo.created_at.desc())
            .offset(skip if not media_type else 0)
            .limit(limit if not media_type else limit // 3)
        )
        for row in photo_result.all():
            media_list.append({
                "id": f"photo_{row.id}",
                "type": "photo",
                "title": row.title,
                "url": row.image_url,
                "thumbnail_url": row.thumbnail_url or row.image_url,
                "file_size": row.file_size,
                "width": row.width,
                "height": row.height,
                "related_id": row.id,
                "related_type": "photo",
                "created_at": row.created_at.isoformat() if row.created_at else None,
            })
    
    # 获取AI项目封面图
    if not media_type or media_type == "ai_cover":
        ai_result = await db.execute(
            select(AIProject.id, AIProject.title, AIProject.cover_image, AIProject.created_at)
            .where(AIProject.cover_image.isnot(None))
            .order_by(AIProject.created_at.desc())
            .offset(skip if not media_type else 0)
            .limit(limit if not media_type else limit // 3)
        )
        for row in ai_result.all():
            media_list.append({
                "id": f"ai_{row.id}",
                "type": "ai_cover",
                "title": row.title,
                "url": row.cover_image,
                "thumbnail_url": row.cover_image,
                "related_id": row.id,
                "related_type": "ai_project",
                "created_at": row.created_at.isoformat() if row.created_at else None,
            })
    
    # 按创建时间排序
    media_list.sort(key=lambda x: x.get("created_at") or "", reverse=True)
    
    return {
        "items": media_list[:limit],
        "total": len(media_list),
        "skip": skip,
        "limit": limit
    }


@router.delete("/{media_id}")
async def delete_media(
    media_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除媒体资源"""
    # 解析media_id格式: type_id (如: blog_1, photo_2, ai_3)
    parts = media_id.split("_", 1)
    if len(parts) != 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的媒体ID格式"
        )
    
    media_type, resource_id = parts[0], int(parts[1])
    
    if media_type == "blog":
        result = await db.execute(select(Blog).where(Blog.id == resource_id))
        resource = result.scalar_one_or_none()
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="资源不存在")
        
        # 删除OSS文件
        if resource.cover_image and oss_service.enabled:
            # 从URL中提取OSS路径
            # URL格式可能是: https://bucket.endpoint/path/to/file.jpg
            # 或: https://cdn.domain.com/path/to/file.jpg
            url = resource.cover_image
            if settings.OSS_BASE_URL and url.startswith(settings.OSS_BASE_URL):
                file_path = url.replace(settings.OSS_BASE_URL.rstrip('/') + '/', '')
            elif f"{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}" in url:
                # 从完整URL中提取路径部分
                parts = url.split(f"{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}/")
                if len(parts) > 1:
                    file_path = parts[1].split('?')[0]  # 移除查询参数
                else:
                    file_path = url.split('/')[-1]
            else:
                # 尝试从URL中提取路径
                file_path = url.split('/')[-1].split('?')[0]
            
            if file_path:
                oss_service.delete_file(file_path)
        
        # 清除数据库中的引用
        resource.cover_image = None
        await db.commit()
        
    elif media_type == "photo":
        result = await db.execute(select(Photo).where(Photo.id == resource_id))
        resource = result.scalar_one_or_none()
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="资源不存在")
        
        # 删除OSS文件
        if oss_service.enabled:
            def extract_path(url: str) -> str:
                """从URL中提取OSS文件路径"""
                if not url:
                    return ""
                if settings.OSS_BASE_URL and url.startswith(settings.OSS_BASE_URL):
                    return url.replace(settings.OSS_BASE_URL.rstrip('/') + '/', '')
                elif f"{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}" in url:
                    parts = url.split(f"{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}/")
                    if len(parts) > 1:
                        return parts[1].split('?')[0]
                    else:
                        return url.split('/')[-1].split('?')[0]
                else:
                    return url.split('/')[-1].split('?')[0]
            
            if resource.image_url:
                file_path = extract_path(resource.image_url)
                if file_path:
                    oss_service.delete_file(file_path)
            if resource.thumbnail_url:
                thumb_path = extract_path(resource.thumbnail_url)
                if thumb_path:
                    oss_service.delete_file(thumb_path)
        
        # 删除数据库记录
        await db.delete(resource)
        await db.commit()
        
    elif media_type == "ai":
        result = await db.execute(select(AIProject).where(AIProject.id == resource_id))
        resource = result.scalar_one_or_none()
        if not resource:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="资源不存在")
        
        # 删除OSS文件
        if resource.cover_image and oss_service.enabled:
            url = resource.cover_image
            if settings.OSS_BASE_URL and url.startswith(settings.OSS_BASE_URL):
                file_path = url.replace(settings.OSS_BASE_URL.rstrip('/') + '/', '')
            elif f"{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}" in url:
                parts = url.split(f"{settings.OSS_BUCKET_NAME}.{settings.OSS_ENDPOINT}/")
                if len(parts) > 1:
                    file_path = parts[1].split('?')[0]
                else:
                    file_path = url.split('/')[-1].split('?')[0]
            else:
                file_path = url.split('/')[-1].split('?')[0]
            
            if file_path:
                oss_service.delete_file(file_path)
        
        # 清除数据库中的引用
        resource.cover_image = None
        await db.commit()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的资源类型"
        )
    
    return {"message": "删除成功"}


@router.get("/unused")
async def get_unused_media(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """获取未使用的媒体资源（需要OSS支持列出文件）"""
    # 注意：这个功能需要OSS支持列出所有文件，实现较复杂
    # 这里先返回提示信息
    return {
        "message": "未使用资源检测功能需要OSS API支持",
        "note": "当前版本建议手动检查未使用的资源"
    }

