"""
文件上传API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import Optional
import uuid
from datetime import datetime
from pathlib import Path

from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.utils.oss import oss_service

router = APIRouter(prefix="/upload", tags=["文件上传"])


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    上传图片到OSS
    
    支持格式: jpg, jpeg, png, gif, webp
    """
    # 检查文件类型
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"不支持的文件类型，仅支持: {', '.join(allowed_types)}"
        )
    
    # 读取文件内容
    try:
        file_content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"读取文件失败: {str(e)}"
        )
    
    # 检查文件大小（最大10MB）
    max_size = 10 * 1024 * 1024
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件大小超过10MB限制"
        )
    
    # 生成文件路径（按年月自动创建文件夹）
    # 路径格式: images/YYYY/MM/uuid.jpg
    # OSS会自动创建 images/2025/11/ 这样的文件夹结构
    file_ext = Path(file.filename).suffix.lower() or ".jpg"
    date_str = datetime.now().strftime("%Y/%m")
    file_name = f"{uuid.uuid4().hex}{file_ext}"
    file_path = f"images/{date_str}/{file_name}"
    
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
    
    return {
        "url": result["url"],
        "thumbnail_url": result.get("thumbnail_url"),
        "width": result["width"],
        "height": result["height"],
        "file_size": result["file_size"]
    }


@router.post("/file")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """
    上传文件到OSS
    
    支持任意文件类型
    """
    # 读取文件内容
    try:
        file_content = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"读取文件失败: {str(e)}"
        )
    
    # 检查文件大小（最大50MB）
    max_size = 50 * 1024 * 1024
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="文件大小超过50MB限制"
        )
    
    # 生成文件路径（按年月自动创建文件夹）
    # 路径格式: files/YYYY/MM/uuid.ext
    # OSS会自动创建 files/2025/11/ 这样的文件夹结构
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




