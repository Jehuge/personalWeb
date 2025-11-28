"""
摄影作品API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.models.photo import Photo, PhotoCategory
from app.schemas.photo import (
    Photo as PhotoSchema,
    PhotoCreate,
    PhotoUpdate,
    PhotoCategory as PhotoCategorySchema,
    PhotoCategoryCreate
)
from app.utils.oss import oss_service

router = APIRouter(prefix="/photos", tags=["摄影作品"])


# ========== 摄影分类管理 ==========
@router.get("/categories", response_model=List[PhotoCategorySchema])
async def get_photo_categories(db: AsyncSession = Depends(get_db)):
    """获取所有摄影分类"""
    result = await db.execute(select(PhotoCategory).order_by(PhotoCategory.created_at))
    return result.scalars().all()


@router.post("/categories", response_model=PhotoCategorySchema, status_code=status.HTTP_201_CREATED)
async def create_photo_category(
    category_data: PhotoCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建摄影分类（需要登录）"""
    # 检查slug是否已存在
    result = await db.execute(
        select(PhotoCategory).where(PhotoCategory.slug == category_data.slug)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="分类slug已存在"
        )
    
    db_category = PhotoCategory(**category_data.dict())
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category


@router.put("/categories/{category_id}", response_model=PhotoCategorySchema)
async def update_photo_category(
    category_id: int,
    category_data: PhotoCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新摄影分类（需要登录）"""
    result = await db.execute(
        select(PhotoCategory).where(PhotoCategory.id == category_id)
    )
    db_category = result.scalar_one_or_none()
    
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在"
        )
    
    # 检查slug唯一性
    if category_data.slug != db_category.slug:
        result = await db.execute(
            select(PhotoCategory).where(PhotoCategory.slug == category_data.slug)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类slug已存在"
            )
    
    for field, value in category_data.dict().items():
        setattr(db_category, field, value)
    
    await db.commit()
    await db.refresh(db_category)
    return db_category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除摄影分类（需要登录）"""
    result = await db.execute(
        select(PhotoCategory).where(PhotoCategory.id == category_id)
    )
    db_category = result.scalar_one_or_none()
    
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在"
        )
    
    await db.delete(db_category)
    await db.commit()
    return None


# ========== 摄影作品管理 ==========
@router.get("", response_model=List[PhotoSchema])
async def get_photos(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    is_featured: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """获取摄影作品列表"""
    query = select(Photo).options(selectinload(Photo.category))
    
    if category_id:
        query = query.where(Photo.category_id == category_id)
    
    if is_featured is not None:
        query = query.where(Photo.is_featured == is_featured)
    
    query = query.order_by(Photo.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{photo_id}", response_model=PhotoSchema)
async def get_photo(photo_id: int, db: AsyncSession = Depends(get_db)):
    """获取单张摄影作品"""
    try:
        result = await db.execute(
            select(Photo)
            .options(selectinload(Photo.category))
            .where(Photo.id == photo_id)
        )
        photo = result.scalar_one_or_none()
        
        if not photo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="摄影作品不存在"
            )
        
        # 增加浏览量（异步更新，不阻塞返回）
        try:
            photo.view_count = (photo.view_count or 0) + 1
            await db.commit()
            await db.refresh(photo)
        except Exception as e:
            # 如果更新浏览量失败，回滚但不影响返回数据
            await db.rollback()
            # 重新查询以获取最新数据
            result = await db.execute(
                select(Photo)
                .options(selectinload(Photo.category))
                .where(Photo.id == photo_id)
            )
            photo = result.scalar_one()
            print(f"更新浏览量失败，已回滚: {e}")
        
        return photo
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取照片详情失败: {error_msg}"
        )


@router.post("", response_model=PhotoSchema, status_code=status.HTTP_201_CREATED)
async def create_photo(
    photo_data: PhotoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建摄影作品（需要登录）"""
    # 检查分类是否存在
    if photo_data.category_id:
        result = await db.execute(
            select(PhotoCategory).where(PhotoCategory.id == photo_data.category_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类不存在"
            )
    
    db_photo = Photo(**photo_data.dict())
    db.add(db_photo)
    await db.commit()
    await db.refresh(db_photo)
    
    # 重新加载关联数据
    result = await db.execute(
        select(Photo)
        .options(selectinload(Photo.category))
        .where(Photo.id == db_photo.id)
    )
    return result.scalar_one()


@router.put("/{photo_id}", response_model=PhotoSchema)
async def update_photo(
    photo_id: int,
    photo_data: PhotoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新摄影作品（需要登录）"""
    result = await db.execute(
        select(Photo)
        .options(selectinload(Photo.category))
        .where(Photo.id == photo_id)
    )
    db_photo = result.scalar_one_or_none()
    
    if not db_photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="摄影作品不存在"
        )
    
    # 更新字段
    update_data = photo_data.dict(exclude_unset=True)
    
    # 处理分类
    if "category_id" in update_data:
        if update_data["category_id"]:
            result = await db.execute(
                select(PhotoCategory).where(PhotoCategory.id == update_data["category_id"])
            )
            if not result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="分类不存在"
                )
    
    for field, value in update_data.items():
        setattr(db_photo, field, value)
    
    await db.commit()
    await db.refresh(db_photo)
    
    # 重新加载关联数据
    result = await db.execute(
        select(Photo)
        .options(selectinload(Photo.category))
        .where(Photo.id == db_photo.id)
    )
    return result.scalar_one()


@router.delete("/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_photo(
    photo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除摄影作品（需要登录）"""
    result = await db.execute(select(Photo).where(Photo.id == photo_id))
    db_photo = result.scalar_one_or_none()
    
    if not db_photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="摄影作品不存在"
        )
    
    # 删除OSS文件
    if oss_service.enabled:
        paths_to_delete = []
        if db_photo.image_url:
            path = oss_service.extract_oss_path(db_photo.image_url)
            if path:
                paths_to_delete.append(path)
        if db_photo.thumbnail_url:
            thumb_path = oss_service.extract_oss_path(db_photo.thumbnail_url)
            if thumb_path:
                paths_to_delete.append(thumb_path)
        
        for path in paths_to_delete:
            try:
                oss_service.delete_file(path)
            except Exception as e:
                # 记录错误但不阻止数据库删除
                print(f"删除OSS文件失败 ({path}): {e}")
    
    await db.delete(db_photo)
    await db.commit()
    return None




