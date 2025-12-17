from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, DECIMAL, BigInteger
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class VideoCategory(Base):
    """视频分类模型"""
    __tablename__ = "video_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    cover_image = Column(String(500), nullable=True)  # 分类封面图
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    videos = relationship("Video", back_populates="category")


class Video(Base):
    """视频模型"""
    __tablename__ = "videos"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    video_url = Column(String(500), nullable=False)  # 原视频URL（OSS）
    thumbnail_video_url = Column(String(500), nullable=True)  # 缩略视频URL（OSS）
    duration = Column(Integer, nullable=True)  # 视频时长（秒）
    width = Column(Integer, nullable=True)  # 视频宽度
    height = Column(Integer, nullable=True)  # 视频高度
    file_size = Column(BigInteger, nullable=True)  # 原视频文件大小（字节）
    thumbnail_file_size = Column(BigInteger, nullable=True)  # 缩略视频文件大小（字节）
    format = Column(String(50), nullable=True)  # 视频格式（如mp4, mov等）
    codec = Column(String(100), nullable=True)  # 视频编码（如h264, hevc等）
    fps = Column(DECIMAL(10, 2), nullable=True)  # 帧率
    bitrate = Column(Integer, nullable=True)  # 比特率（bps）
    category_id = Column(Integer, ForeignKey("video_categories.id"), nullable=True)
    is_featured = Column(Boolean, default=False)  # 是否精选
    is_published = Column(Boolean, default=False)  # 是否已发布
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)
    
    category = relationship("VideoCategory", back_populates="videos")

