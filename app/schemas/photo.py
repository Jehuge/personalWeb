from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class PhotoCategoryBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    cover_image: Optional[str] = None


class PhotoCategoryCreate(PhotoCategoryBase):
    pass


class PhotoCategory(PhotoCategoryBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class PhotoBase(BaseModel):
    title: str
    description: Optional[str] = None
    image_url: str
    thumbnail_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    category_id: Optional[int] = None
    is_featured: bool = False


class PhotoCreate(PhotoBase):
    pass


class PhotoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    category_id: Optional[int] = None
    is_featured: Optional[bool] = None


class Photo(PhotoBase):
    id: int
    view_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    category: Optional[PhotoCategory] = None
    
    class Config:
        from_attributes = True

