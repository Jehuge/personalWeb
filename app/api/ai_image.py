"""
AI Image API 路由
"""
from typing import List, Optional
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status, Response, UploadFile, File, Form
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_user
from app.core.database import get_db
from app.core.config import settings
from app.models.ai_image import AIImage
from app.models.user import User
from app.schemas.ai_image import (
    AIImage as AIImageSchema,
    AIImageCreate,
    AIImageUpdate,
)
from app.utils.oss import oss_service
from app.services.image_utils import read_image_bytes, generate_image_path
from sqlalchemy import or_

router = APIRouter(prefix="/ai-images", tags=["AI Image"])


@router.get("", response_model=List[AIImageSchema])
async def list_ai_images(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    is_featured: Optional[bool] = None,
    category: Optional[str] = None,
    published_only: bool = Query(False, description="只返回已发布的图片"),
    nsfw_access_code: Optional[str] = Query(None, description="图片访问特殊码"),
    db: AsyncSession = Depends(get_db),
    response: Response = None,
):
    """获取 AI 图片列表"""
    # 验证特殊码
    show_nsfw = False
    if nsfw_access_code and settings.NSFW_ACCESS_CODE:
        if nsfw_access_code == settings.NSFW_ACCESS_CODE:
            show_nsfw = True
    
    # 构建查询条件（用于总数统计和分页查询）
    base_query = select(AIImage)

    if published_only:
        base_query = base_query.where(AIImage.is_published == True)  # noqa: E712

    if is_featured is not None:
        base_query = base_query.where(AIImage.is_featured == is_featured)

    if category:
        base_query = base_query.where(AIImage.category == category)

    # 根据特殊码决定显示逻辑（只在公开访问时应用过滤）
    # 后台管理界面不传 published_only，应该能看到所有图片
    if published_only:
        if show_nsfw:
            # 如果提供了正确的访问码，只显示tags包含nsfw的图片
            base_query = base_query.where(AIImage.tags.contains("nsfw"))
        else:
            # 如果没有提供正确的访问码，排除tags包含nsfw的图片
            base_query = base_query.where(
                or_(
                    AIImage.tags.is_(None),
                    AIImage.tags == "",
                    ~AIImage.tags.contains("nsfw")
                )
            )

    # 计算总数
    count_query = select(func.count(AIImage.id))
    if published_only:
        count_query = count_query.where(AIImage.is_published == True)  # noqa: E712
    if is_featured is not None:
        count_query = count_query.where(AIImage.is_featured == is_featured)
    if category:
        count_query = count_query.where(AIImage.category == category)
    # 根据特殊码决定显示逻辑（只在公开访问时应用过滤）
    if published_only:
        if show_nsfw:
            # 如果提供了正确的访问码，只显示tags包含nsfw的图片
            count_query = count_query.where(AIImage.tags.contains("nsfw"))
        else:
            # 如果没有提供正确的访问码，排除tags包含nsfw的图片
            count_query = count_query.where(
                or_(
                    AIImage.tags.is_(None),
                    AIImage.tags == "",
                    ~AIImage.tags.contains("nsfw")
                )
            )
    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0

    # 分页查询
    query = base_query.order_by(AIImage.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    images = result.scalars().all()

    # 在响应头中添加总数
    if response is not None:
        response.headers["X-Total-Count"] = str(total_count)

    return images


@router.get("/{image_id}", response_model=AIImageSchema)
async def get_ai_image(image_id: int, db: AsyncSession = Depends(get_db)):
    """获取单张图片"""
    result = await db.execute(select(AIImage).where(AIImage.id == image_id))
    image = result.scalar_one_or_none()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="图片不存在",
        )

    # 增加浏览量（异步更新，不阻塞返回）
    try:
        image.view_count = (image.view_count or 0) + 1
        await db.commit()
        await db.refresh(image)
    except Exception as e:
        await db.rollback()
        # 重新查询
        result = await db.execute(select(AIImage).where(AIImage.id == image_id))
        image = result.scalar_one()

    return image


@router.post("", response_model=AIImageSchema, status_code=status.HTTP_201_CREATED)
async def create_ai_image(
    image_data: AIImageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """创建 AI 图片（需要登录）"""
    image_dict = image_data.dict()
    db_image = AIImage(**image_dict)
    db.add(db_image)
    await db.commit()
    await db.refresh(db_image)
    return db_image


async def _process_ai_image_file(file: UploadFile) -> dict:
    """处理AI图片文件上传"""
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


@router.post("/with-file", response_model=AIImageSchema, status_code=status.HTTP_201_CREATED)
async def create_ai_image_with_file(
    title: Optional[str] = Form(None),
    prompt: Optional[str] = Form(None),
    negative_prompt: Optional[str] = Form(None),
    model_name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    parameters: Optional[str] = Form(None),
    is_featured: bool = Form(False),
    is_published: bool = Form(True),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """通过文件上传创建 AI 图片（需要登录）"""
    upload_result = await _process_ai_image_file(file)
    
    # 解析parameters JSON
    parameters_dict = None
    if parameters:
        try:
            parameters_dict = json.loads(parameters)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="parameters 必须是有效的 JSON 格式",
            )
    
    db_image = AIImage(
        title=title,
        image_url=upload_result["url"],
        thumbnail_url=upload_result.get("thumbnail_url"),
        prompt=prompt,
        negative_prompt=negative_prompt,
        model_name=model_name,
        category=category,
        tags=tags,
        parameters=parameters_dict,
        is_featured=is_featured,
        is_published=is_published,
    )
    db.add(db_image)
    await db.commit()
    await db.refresh(db_image)
    return db_image


@router.put("/{image_id}", response_model=AIImageSchema)
async def update_ai_image(
    image_id: int,
    image_data: AIImageUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """更新 AI 图片（需要登录）"""
    result = await db.execute(select(AIImage).where(AIImage.id == image_id))
    db_image = result.scalar_one_or_none()

    if not db_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="图片不存在",
        )

    update_data = image_data.dict(exclude_unset=True)

    # 检查是否有图片更新，如果有则删除旧图片
    if "image_url" in update_data and update_data["image_url"] != db_image.image_url:
        old_url = db_image.image_url
        if old_url:
            path = oss_service.extract_oss_path(old_url)
            if path:
                try:
                    oss_service.delete_file(path)
                except Exception as e:
                    print(f"删除旧图片失败 ({path}): {e}")

    if "thumbnail_url" in update_data and update_data["thumbnail_url"] != db_image.thumbnail_url:
        old_thumb = db_image.thumbnail_url
        if old_thumb:
            path = oss_service.extract_oss_path(old_thumb)
            if path:
                try:
                    oss_service.delete_file(path)
                except Exception as e:
                    print(f"删除旧缩略图失败 ({path}): {e}")

    for field, value in update_data.items():
        setattr(db_image, field, value)

    await db.commit()
    await db.refresh(db_image)
    return db_image


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_image(
    image_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """删除 AI 图片（需要登录）"""
    result = await db.execute(select(AIImage).where(AIImage.id == image_id))
    db_image = result.scalar_one_or_none()

    if not db_image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="图片不存在",
        )

    # 删除OSS文件
    if oss_service.enabled:
        paths_to_delete = []
        if db_image.image_url:
            path = oss_service.extract_oss_path(db_image.image_url)
            if path:
                paths_to_delete.append(path)
        if db_image.thumbnail_url:
            thumb_path = oss_service.extract_oss_path(db_image.thumbnail_url)
            if thumb_path:
                paths_to_delete.append(thumb_path)
        
        for path in paths_to_delete:
            try:
                oss_service.delete_file(path)
            except Exception as e:
                # 记录错误但不阻止数据库删除
                print(f"删除OSS文件失败 ({path}): {e}")

    await db.delete(db_image)
    await db.commit()
    return None
