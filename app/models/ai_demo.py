from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func

from app.core.database import Base


class AIDemo(Base):
    """AI 实验室 Demo 元数据"""
    __tablename__ = "ai_demos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    cover_image = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True)
    tags = Column(String(500), nullable=True)
    bundle_path = Column(String(200), nullable=True)  # 相对 public/aiLab 的目录
    entry_file = Column(String(200), nullable=False, default="index.html")
    external_url = Column(String(500), nullable=True)
    iframe_height = Column(Integer, nullable=True)
    is_featured = Column(Boolean, default=False)
    is_published = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)


















