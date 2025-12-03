from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.core.database import Base

class AIImage(Base):
    """AI 生成图片模型"""
    __tablename__ = "ai_images"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=True)
    image_url = Column(String(500), nullable=False)  # OSS URL
    thumbnail_url = Column(String(500), nullable=True)
    prompt = Column(Text, nullable=True)
    negative_prompt = Column(Text, nullable=True)
    model_name = Column(String(100), nullable=True)  # e.g., Midjourney v6, Stable Diffusion XL
    parameters = Column(JSON, nullable=True)  # 其他参数：seed, cfg_scale, steps 等
    category = Column(String(100), nullable=True)
    tags = Column(String(500), nullable=True)
    is_featured = Column(Boolean, default=False)
    is_published = Column(Boolean, default=True)
    view_count = Column(Integer, default=0)
    like_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
