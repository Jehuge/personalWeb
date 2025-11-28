from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class CategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class Category(CategoryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class TagBase(BaseModel):
    name: str
    slug: str


class TagCreate(TagBase):
    pass


class Tag(TagBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class BlogBase(BaseModel):
    title: str
    slug: str
    content: str
    excerpt: Optional[str] = None
    cover_image: Optional[str] = None
    is_published: bool = False
    category_id: Optional[int] = None


class BlogCreate(BlogBase):
    tag_ids: List[int] = []


class BlogUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    cover_image: Optional[str] = None
    is_published: Optional[bool] = None
    category_id: Optional[int] = None
    tag_ids: Optional[List[int]] = None


class Blog(BlogBase):
    id: int
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    category: Optional[Category] = None
    tags: List[Tag] = []
    
    class Config:
        from_attributes = True

