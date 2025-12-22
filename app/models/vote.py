from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class Vote(Base):
    """通用投票记录（点赞/拉踩）"""
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)
    content_type = Column(String(50), nullable=False, index=True)  # e.g., blog, photo, video, ai_image, ai_demo
    content_id = Column(Integer, nullable=False, index=True)
    action = Column(Integer, nullable=False)  # 1 = like, -1 = dislike
    visitor_id = Column(String(200), nullable=True, index=True)  # 网站生成的访客 id 或来自前端的 uuid
    user_agent = Column(Text, nullable=True)
    ip = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


