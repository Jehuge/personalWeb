from typing import Optional, Any, Dict
from pydantic import BaseModel
from datetime import datetime

class AIImageBase(BaseModel):
    title: Optional[str] = None
    image_url: str
    thumbnail_url: Optional[str] = None
    prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    model_name: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    category: Optional[str] = None
    tags: Optional[str] = None
    is_featured: bool = False
    is_published: bool = True

class AIImageCreate(AIImageBase):
    pass

class AIImageUpdate(AIImageBase):
    image_url: Optional[str] = None
    is_published: Optional[bool] = None

class AIImage(AIImageBase):
    id: int
    view_count: int
    like_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
