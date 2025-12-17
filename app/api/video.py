"""
视频管理API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime
import tempfile
import os
from pathlib import Path

from app.core.database import get_db
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.models.video import Video, VideoCategory
from app.schemas.video import (
    Video as VideoSchema,
    VideoCreate,
    VideoUpdate,
    VideoCategory as VideoCategorySchema,
    VideoCategoryCreate
)
from app.utils.oss import oss_service
from app.services.video_utils import (
    check_ffmpeg_available,
    get_video_info,
    generate_thumbnail_video
)

router = APIRouter(prefix="/videos", tags=["视频管理"])


# ========== 视频分类管理 ==========
@router.get("/categories", response_model=List[VideoCategorySchema])
async def get_video_categories(db: AsyncSession = Depends(get_db)):
    """获取所有视频分类"""
    result = await db.execute(select(VideoCategory).order_by(VideoCategory.created_at))
    return result.scalars().all()


@router.post("/categories", response_model=VideoCategorySchema, status_code=status.HTTP_201_CREATED)
async def create_video_category(
    category_data: VideoCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建视频分类（需要登录）"""
    # 检查slug是否已存在
    result = await db.execute(
        select(VideoCategory).where(VideoCategory.slug == category_data.slug)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="分类slug已存在"
        )
    
    db_category = VideoCategory(**category_data.dict())
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category


@router.put("/categories/{category_id}", response_model=VideoCategorySchema)
async def update_video_category(
    category_id: int,
    category_data: VideoCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新视频分类（需要登录）"""
    result = await db.execute(
        select(VideoCategory).where(VideoCategory.id == category_id)
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
            select(VideoCategory).where(VideoCategory.slug == category_data.slug)
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
async def delete_video_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除视频分类（需要登录）"""
    result = await db.execute(
        select(VideoCategory).where(VideoCategory.id == category_id)
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


# ========== 视频管理 ==========
@router.get("", response_model=List[VideoSchema])
async def get_videos(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    is_featured: Optional[bool] = None,
    is_published: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    response: Response = None
):
    """获取视频列表"""
    # 构建查询条件
    base_query = select(Video).options(selectinload(Video.category))
    
    if category_id:
        base_query = base_query.where(Video.category_id == category_id)
    
    if is_featured is not None:
        base_query = base_query.where(Video.is_featured == is_featured)
    
    if is_published is not None:
        base_query = base_query.where(Video.is_published == is_published)
    
    # 计算总数
    count_query = select(func.count(Video.id))
    if category_id:
        count_query = count_query.where(Video.category_id == category_id)
    if is_featured is not None:
        count_query = count_query.where(Video.is_featured == is_featured)
    if is_published is not None:
        count_query = count_query.where(Video.is_published == is_published)
    total_result = await db.execute(count_query)
    total_count = total_result.scalar() or 0
    
    # 分页查询
    query = base_query.order_by(Video.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    videos = result.scalars().all()
    
    # 在响应头中添加总数
    if response is not None:
        response.headers["X-Total-Count"] = str(total_count)
    
    return videos


@router.get("/{video_id}", response_model=VideoSchema)
async def get_video(video_id: int, db: AsyncSession = Depends(get_db)):
    """获取单个视频"""
    try:
        result = await db.execute(
            select(Video)
            .options(selectinload(Video.category))
            .where(Video.id == video_id)
        )
        video = result.scalar_one_or_none()
        
        if not video:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="视频不存在"
            )
        
        # 增加浏览量（异步更新，不阻塞返回）
        try:
            video.view_count = (video.view_count or 0) + 1
            await db.commit()
            await db.refresh(video)
        except Exception as e:
            await db.rollback()
            result = await db.execute(
                select(Video)
                .options(selectinload(Video.category))
                .where(Video.id == video_id)
            )
            video = result.scalar_one()
            print(f"更新浏览量失败，已回滚: {e}")
        
        return video
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取视频详情失败: {error_msg}"
        )


@router.post("", response_model=VideoSchema, status_code=status.HTTP_201_CREATED)
async def create_video(
    video_data: VideoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建视频（需要登录）"""
    # 检查分类是否存在
    if video_data.category_id:
        result = await db.execute(
            select(VideoCategory).where(VideoCategory.id == video_data.category_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类不存在"
            )
    
    db_video = Video(**video_data.dict())
    db.add(db_video)
    await db.commit()
    await db.refresh(db_video)
    
    # 重新加载关联数据
    result = await db.execute(
        select(Video)
        .options(selectinload(Video.category))
        .where(Video.id == db_video.id)
    )
    return result.scalar_one()


@router.post("/with-file", response_model=VideoSchema, status_code=status.HTTP_201_CREATED)
async def create_video_with_file(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category_id: Optional[int] = Form(None),
    is_featured: bool = Form(False),
    is_published: bool = Form(False),
    published_at: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    上传视频并创建记录（需要登录）
    流程：1. 接收视频文件 2. 本地ffmpeg处理生成缩略视频 3. 上传原视频和缩略视频到OSS 4. 写入数据库
    """
    # 检查ffmpeg是否可用
    if not check_ffmpeg_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ffmpeg不可用，请确保已安装ffmpeg"
        )
    
    # 检查分类是否存在
    if category_id:
        result = await db.execute(
            select(VideoCategory).where(VideoCategory.id == category_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类不存在"
            )
    
    # 保存上传的视频到临时文件
    temp_input = None
    temp_output = None
    
    try:
        # 读取视频文件
        video_content = await file.read()
        if len(video_content) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="视频文件为空"
            )
        
        # 保存到临时文件
        suffix = Path(file.filename or "").suffix or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
            f.write(video_content)
            temp_input = f.name
        
        # 获取视频信息
        video_info = get_video_info(temp_input)
        if not video_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无法获取视频信息，请确保文件是有效的视频格式"
            )
        
        # 生成缩略视频（高质量，最大1920x1080，最多30秒）
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as f:
            temp_output = f.name
        
        success = generate_thumbnail_video(
            temp_input,
            temp_output,
            max_width=1920,
            max_height=1080,
            quality='high',
            max_duration=30  # 缩略视频最多30秒
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="生成缩略视频失败"
            )
        
        # 读取缩略视频内容
        with open(temp_output, 'rb') as f:
            thumbnail_content = f.read()
        
        thumbnail_file_size = len(thumbnail_content)
        
        # 生成OSS路径
        date_str = datetime.now().strftime("%Y/%m")
        import uuid
        video_filename = f"{uuid.uuid4().hex}{suffix}"
        thumbnail_filename = f"{uuid.uuid4().hex}.mp4"
        video_path = f"videos/{date_str}/{video_filename}"
        thumbnail_path = f"videos/{date_str}/thumbnails/{thumbnail_filename}"
        
        # 上传原视频到OSS
        video_url = oss_service.upload_video(
            video_content,
            video_path,
            content_type=file.content_type or "video/mp4"
        )
        
        if not video_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="原视频上传失败，请检查OSS配置"
            )
        
        # 上传缩略视频到OSS
        thumbnail_url = oss_service.upload_video(
            thumbnail_content,
            thumbnail_path,
            content_type="video/mp4"
        )
        
        if not thumbnail_url:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="缩略视频上传失败，请检查OSS配置"
            )
        
        # 解析发布时间
        published_at_value = None
        if published_at:
            try:
                published_at_value = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
            except ValueError:
                pass
        
        # 创建视频记录
        db_video = Video(
            title=title,
            description=description,
            video_url=video_url,
            thumbnail_video_url=thumbnail_url,
            duration=video_info.get('duration'),
            width=video_info.get('width'),
            height=video_info.get('height'),
            file_size=video_info.get('file_size'),
            thumbnail_file_size=thumbnail_file_size,
            format=video_info.get('format'),
            codec=video_info.get('codec'),
            fps=video_info.get('fps'),
            bitrate=video_info.get('bitrate'),
            category_id=category_id,
            is_featured=is_featured,
            is_published=is_published,
            published_at=published_at_value,
        )
        db.add(db_video)
        await db.commit()
        await db.refresh(db_video)
        
        # 重新加载关联数据
        result = await db.execute(
            select(Video)
            .options(selectinload(Video.category))
            .where(Video.id == db_video.id)
        )
        return result.scalar_one()
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"处理视频失败: {error_msg}"
        )
    finally:
        # 清理临时文件
        if temp_input and os.path.exists(temp_input):
            try:
                os.unlink(temp_input)
            except:
                pass
        if temp_output and os.path.exists(temp_output):
            try:
                os.unlink(temp_output)
            except:
                pass


@router.put("/{video_id}", response_model=VideoSchema)
async def update_video(
    video_id: int,
    video_data: VideoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新视频（需要登录）"""
    result = await db.execute(
        select(Video)
        .options(selectinload(Video.category))
        .where(Video.id == video_id)
    )
    db_video = result.scalar_one_or_none()
    
    if not db_video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="视频不存在"
        )
    
    # 更新字段
    update_data = video_data.dict(exclude_unset=True)
    
    # 处理分类
    if "category_id" in update_data:
        if update_data["category_id"]:
            result = await db.execute(
                select(VideoCategory).where(VideoCategory.id == update_data["category_id"])
            )
            if not result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="分类不存在"
                )
    
    for field, value in update_data.items():
        setattr(db_video, field, value)
    
    await db.commit()
    await db.refresh(db_video)
    
    # 重新加载关联数据
    result = await db.execute(
        select(Video)
        .options(selectinload(Video.category))
        .where(Video.id == db_video.id)
    )
    return result.scalar_one()


@router.delete("/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_video(
    video_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除视频（需要登录）"""
    result = await db.execute(select(Video).where(Video.id == video_id))
    db_video = result.scalar_one_or_none()
    
    if not db_video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="视频不存在"
        )
    
    # 删除OSS文件
    if oss_service.enabled:
        paths_to_delete = []
        if db_video.video_url:
            path = oss_service.extract_oss_path(db_video.video_url)
            if path:
                paths_to_delete.append(path)
        if db_video.thumbnail_video_url:
            thumb_path = oss_service.extract_oss_path(db_video.thumbnail_video_url)
            if thumb_path:
                paths_to_delete.append(thumb_path)
        
        for path in paths_to_delete:
            try:
                oss_service.delete_file(path)
            except Exception as e:
                # 记录错误但不阻止数据库删除
                print(f"删除OSS文件失败 ({path}): {e}")
    
    await db.delete(db_video)
    await db.commit()
    return None

