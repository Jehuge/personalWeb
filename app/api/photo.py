"""
摄影作品API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import json

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
from app.services.image_utils import read_image_bytes, generate_image_path

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
    db: AsyncSession = Depends(get_db),
    response: Response = None
):
    """获取摄影作品列表"""
    # 构建查询条件（用于总数统计和分页查询）
    base_query = select(Photo).options(selectinload(Photo.category))
    
    if category_id:
        base_query = base_query.where(Photo.category_id == category_id)
    
    if is_featured is not None:
        base_query = base_query.where(Photo.is_featured == is_featured)
    
    # 计算总数
    count_query = select(func.count(Photo.id))
    if category_id:
        count_query = count_query.where(Photo.category_id == category_id)
    if is_featured is not None:
        count_query = count_query.where(Photo.is_featured == is_featured)
    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0
    
    # 分页查询
    query = base_query.order_by(Photo.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    photos = result.scalars().all()
    
    # 在响应头中添加总数
    if response is not None:
        response.headers["X-Total-Count"] = str(total_count)
    
    return photos


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


@router.post("/with-file", response_model=PhotoSchema, status_code=status.HTTP_201_CREATED)
async def create_photo_with_file(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    is_featured: bool = Form(False),
    make: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    focal_length: Optional[str] = Form(None),
    aperture: Optional[str] = Form(None),
    shutter_speed: Optional[str] = Form(None),
    iso: Optional[str] = Form(None),
    shoot_time: Optional[str] = Form(None),
    exif: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await _ensure_category_exists(db, category_id)
    upload_result = await _process_photo_file(file)
    shoot_time_value = _parse_iso_datetime(shoot_time) if shoot_time else (
        _parse_iso_datetime(upload_result.get("shoot_time")) if upload_result.get("shoot_time") else None
    )
    exif_payload = _merge_exif_payload(exif, upload_result.get("exif"))

    db_photo = Photo(
        title=title,
        description=description,
        image_url=upload_result["url"],
        thumbnail_url=upload_result.get("thumbnail_url"),
        width=upload_result.get("width"),
        height=upload_result.get("height"),
        file_size=upload_result.get("file_size"),
        category_id=category_id,
        is_featured=is_featured,
        make=make or upload_result.get("make"),
        model=model or upload_result.get("model"),
        focal_length=focal_length or upload_result.get("focal_length"),
        aperture=aperture or upload_result.get("aperture"),
        shutter_speed=shutter_speed or upload_result.get("shutter_speed"),
        iso=iso or upload_result.get("iso"),
        shoot_time=shoot_time_value,
        exif=exif_payload,
    )
    db.add(db_photo)
    await db.commit()
    await db.refresh(db_photo)

    result = await db.execute(
        select(Photo).options(selectinload(Photo.category)).where(Photo.id == db_photo.id)
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


@router.put("/{photo_id}/with-file", response_model=PhotoSchema)
async def update_photo_with_file(
    photo_id: int,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    is_featured: bool = Form(False),
    make: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    focal_length: Optional[str] = Form(None),
    aperture: Optional[str] = Form(None),
    shutter_speed: Optional[str] = Form(None),
    iso: Optional[str] = Form(None),
    shoot_time: Optional[str] = Form(None),
    exif: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    await _ensure_category_exists(db, category_id)
    result = await db.execute(
        select(Photo).options(selectinload(Photo.category)).where(Photo.id == photo_id)
    )
    db_photo = result.scalar_one_or_none()
    if not db_photo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="摄影作品不存在",
        )

    upload_result = await _process_photo_file(file)
    shoot_time_value = _parse_iso_datetime(shoot_time) if shoot_time else (
        _parse_iso_datetime(upload_result.get("shoot_time")) if upload_result.get("shoot_time") else None
    )
    exif_payload = _merge_exif_payload(exif, upload_result.get("exif"))

    # 删除旧文件
    for url in (db_photo.image_url, db_photo.thumbnail_url):
        if not url:
            continue
        path = oss_service.extract_oss_path(url)
        if path:
            try:
                oss_service.delete_file(path)
            except Exception as exc:
                print(f"删除旧图片失败 ({path}): {exc}")

    db_photo.title = title
    db_photo.description = description
    db_photo.category_id = category_id
    db_photo.is_featured = is_featured
    db_photo.make = make or upload_result.get("make")
    db_photo.model = model or upload_result.get("model")
    db_photo.focal_length = focal_length or upload_result.get("focal_length")
    db_photo.aperture = aperture or upload_result.get("aperture")
    db_photo.shutter_speed = shutter_speed or upload_result.get("shutter_speed")
    db_photo.iso = iso or upload_result.get("iso")
    db_photo.shoot_time = shoot_time_value
    db_photo.exif = exif_payload
    db_photo.image_url = upload_result["url"]
    db_photo.thumbnail_url = upload_result.get("thumbnail_url")
    db_photo.width = upload_result.get("width")
    db_photo.height = upload_result.get("height")
    db_photo.file_size = upload_result.get("file_size")

    await db.commit()
    await db.refresh(db_photo)

    return db_photo


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


async def _ensure_category_exists(db: AsyncSession, category_id: Optional[int]):
    if not category_id:
        return
    result = await db.execute(select(PhotoCategory).where(PhotoCategory.id == category_id))
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="分类不存在",
        )


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="拍摄时间格式不正确，请使用 ISO8601 格式",
        )


async def _process_photo_file(file: UploadFile) -> dict:
    try:
        file_content = await read_image_bytes(file)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    file_path = generate_image_path(file.filename)
    result = oss_service.upload_image(
        file_content,
        file_path,
        max_size=(1920, 1920),
        quality=85,
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="图片上传失败，请检查OSS配置",
        )
    return result


def _merge_exif_payload(client_exif: Optional[str], upload_exif: Optional[dict]) -> Optional[dict]:
    if client_exif:
        try:
            return json.loads(client_exif)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"EXIF 数据格式错误: {exc}",
            ) from exc
    return upload_exif




