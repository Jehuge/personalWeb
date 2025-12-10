from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class AIDemoBase(BaseModel):
    title: str
    slug: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    bundle_path: Optional[str] = None
    entry_file: Optional[str] = "index.html"
    external_url: Optional[str] = None
    iframe_height: Optional[int] = None
    is_featured: bool = False
    is_published: bool = False
    sort_order: int = 0


class AIDemoCreate(AIDemoBase):
    pass


class AIDemoUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    cover_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    bundle_path: Optional[str] = None
    entry_file: Optional[str] = None
    external_url: Optional[str] = None
    iframe_height: Optional[int] = None
    is_featured: Optional[bool] = None
    is_published: Optional[bool] = None
    sort_order: Optional[int] = None


class AIDemo(AIDemoBase):
    id: int
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True

























