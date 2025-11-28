from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class AIProject(Base):
    """AI项目模型"""
    __tablename__ = "ai_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=True)  # 项目详细介绍
    cover_image = Column(String(500), nullable=True)  # 封面图片
    demo_url = Column(String(500), nullable=True)  # 演示地址
    github_url = Column(String(500), nullable=True)  # GitHub地址
    tech_stack = Column(String(500), nullable=True)  # 技术栈（JSON字符串或逗号分隔）
    is_featured = Column(Boolean, default=False)  # 是否精选
    is_published = Column(Boolean, default=False)
    view_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    published_at = Column(DateTime(timezone=True), nullable=True)

