from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AIProjectBase(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    content: Optional[str] = None
    cover_image: Optional[str] = None
    demo_url: Optional[str] = None
    github_url: Optional[str] = None
    tech_stack: Optional[str] = None
    is_featured: bool = False
    is_published: bool = False


class AIProjectCreate(AIProjectBase):
    pass


class AIProjectUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    cover_image: Optional[str] = None
    demo_url: Optional[str] = None
    github_url: Optional[str] = None
    tech_stack: Optional[str] = None
    is_featured: Optional[bool] = None
    is_published: Optional[bool] = None


class AIProject(AIProjectBase):
    id: int
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

