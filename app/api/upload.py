"""
文件上传API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Optional, List
from pathlib import Path
from datetime import datetime
import uuid

from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.utils.oss import oss_service
from app.services.image_utils import read_image_bytes, generate_image_path
from pydantic import BaseModel

router = APIRouter(prefix="/upload", tags=["文件上传"])


class ImageCleanupItem(BaseModel):
    url: str
    thumbnail_url: Optional[str] = None


class ImageCleanupRequest(BaseModel):
    items: List[ImageCleanupItem]


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    上传图片到OSS
    
    支持格式: jpg, jpeg, png, gif, webp
    """
    try:
        file_content = await read_image_bytes(file)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    file_path = generate_image_path(file.filename)
    
    # 上传到OSS
    result = oss_service.upload_image(
        file_content,
        file_path,
        max_size=(1920, 1920),  # 最大尺寸
        quality=85
    )
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="图片上传失败，请检查OSS配置"
        )
    
    response_payload = {
        "url": result["url"],
        "thumbnail_url": result.get("thumbnail_url"),
        "width": result["width"],
        "height": result["height"],
        "file_size": result["file_size"]
    }
    
    for key in ("exif", "make", "model", "focal_length", "aperture", "shutter_speed", "iso", "shoot_time"):
        if result.get(key) is not None:
            response_payload[key] = result[key]
    
    return response_payload


@router.post("/image/analyze")
async def analyze_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
):
    """
    解析图片基础信息与EXIF，不上传到OSS。
    """
    try:
        file_content = await read_image_bytes(file)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    analysis = oss_service.analyze_image(file_content)
    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="图片解析失败，请检查OSS/依赖配置",
        )
    return analysis


@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    上传文件到OSS
    
    支持任意文件类型
    """
    try:
        file_content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"读取文件失败: {str(e)}"
        )
    
    max_size = 50 * 1024 * 1024
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件大小超过50MB限制"
        )
    
    file_ext = Path(file.filename).suffix.lower()
    date_str = datetime.now().strftime("%Y/%m")
    file_name = f"{uuid.uuid4().hex}{file_ext}"
    file_path = f"files/{date_str}/{file_name}"
    
    # 上传到OSS
    url = oss_service.upload_file(
        file_content,
        file_path,
        content_type=file.content_type
    )
    
    if not url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="文件上传失败，请检查OSS配置"
        )
    
    return {
        "url": url,
        "filename": file.filename,
        "file_size": len(file_content),
        "content_type": file.content_type
    }


@router.post("/image/cleanup")
async def cleanup_images(
    payload: ImageCleanupRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    清理未使用的图片文件

    用于前端上传到 OSS 后，用户取消表单或放弃发布时，主动删除这些孤立文件。
    只根据传入的 URL 删除，不影响数据库中的任何记录。
    """
    deleted = 0
    failed: list[str] = []

    for item in payload.items:
        for url in filter(None, [item.url, item.thumbnail_url]):
            path = oss_service.extract_oss_path(url)
            if not path:
                failed.append(url)
                continue
            ok = oss_service.delete_file(path)
            if ok:
                deleted += 1
            else:
                failed.append(url)

    return {
        "deleted": deleted,
        "failed": failed,
    }




