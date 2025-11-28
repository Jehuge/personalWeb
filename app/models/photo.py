from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class PhotoCategory(Base):
    """摄影作品分类模型"""
    __tablename__ = "photo_categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    cover_image = Column(String(500), nullable=True)  # 分类封面图
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    photos = relationship("Photo", back_populates="category")


class Photo(Base):
    """摄影作品模型"""
    __tablename__ = "photos"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=False)  # 图片URL（OSS）
    thumbnail_url = Column(String(500), nullable=True)  # 缩略图URL
    width = Column(Integer, nullable=True)  # 图片宽度
    height = Column(Integer, nullable=True)  # 图片高度
    file_size = Column(Integer, nullable=True)  # 文件大小（字节）
    category_id = Column(Integer, ForeignKey("photo_categories.id"), nullable=True)
    is_featured = Column(Boolean, default=False)  # 是否精选
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    category = relationship("PhotoCategory", back_populates="photos")

