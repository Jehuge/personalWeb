from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class VideoCategoryBase(BaseModel):
    name: str = Field(..., max_length=50, description="分类名称")
    slug: str = Field(..., max_length=50, description="分类URL标识")
    description: Optional[str] = Field(None, description="分类描述")
    cover_image: Optional[str] = Field(None, max_length=500, description="分类封面图片URL")


class VideoCategoryCreate(VideoCategoryBase):
    pass


class VideoCategory(VideoCategoryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class VideoBase(BaseModel):
    title: str = Field(..., max_length=200, description="视频标题")
    description: Optional[str] = Field(None, description="视频描述")
    video_url: str = Field(..., max_length=500, description="原视频URL")
    thumbnail_video_url: Optional[str] = Field(None, max_length=500, description="缩略视频URL")
    duration: Optional[int] = Field(None, description="视频时长（秒）")
    width: Optional[int] = Field(None, description="视频宽度")
    height: Optional[int] = Field(None, description="视频高度")
    file_size: Optional[int] = Field(None, description="原视频文件大小（字节）")
    thumbnail_file_size: Optional[int] = Field(None, description="缩略视频文件大小（字节）")
    format: Optional[str] = Field(None, max_length=50, description="视频格式")
    codec: Optional[str] = Field(None, max_length=100, description="视频编码")
    fps: Optional[Decimal] = Field(None, description="帧率")
    bitrate: Optional[int] = Field(None, description="比特率（bps）")
    category_id: Optional[int] = Field(None, description="分类ID")
    is_featured: bool = Field(False, description="是否精选")
    is_published: bool = Field(False, description="是否已发布")
    published_at: Optional[datetime] = Field(None, description="发布时间")


class VideoCreate(VideoBase):
    pass


class VideoUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200, description="视频标题")
    description: Optional[str] = Field(None, description="视频描述")
    video_url: Optional[str] = Field(None, max_length=500, description="原视频URL")
    thumbnail_video_url: Optional[str] = Field(None, max_length=500, description="缩略视频URL")
    duration: Optional[int] = Field(None, description="视频时长（秒）")
    width: Optional[int] = Field(None, description="视频宽度")
    height: Optional[int] = Field(None, description="视频高度")
    file_size: Optional[int] = Field(None, description="原视频文件大小（字节）")
    thumbnail_file_size: Optional[int] = Field(None, description="缩略视频文件大小（字节）")
    format: Optional[str] = Field(None, max_length=50, description="视频格式")
    codec: Optional[str] = Field(None, max_length=100, description="视频编码")
    fps: Optional[Decimal] = Field(None, description="帧率")
    bitrate: Optional[int] = Field(None, description="比特率（bps）")
    category_id: Optional[int] = Field(None, description="分类ID")
    is_featured: Optional[bool] = Field(None, description="是否精选")
    is_published: Optional[bool] = Field(None, description="是否已发布")
    published_at: Optional[datetime] = Field(None, description="发布时间")


class Video(VideoBase):
    id: int
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime]
    category: Optional[VideoCategory] = None
    
    class Config:
        from_attributes = True

