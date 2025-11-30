from app.schemas.user import User, UserCreate, UserLogin, Token
from app.schemas.blog import Blog, BlogCreate, BlogUpdate, Category, CategoryCreate, Tag, TagCreate
from app.schemas.photo import Photo, PhotoCreate, PhotoUpdate, PhotoCategory, PhotoCategoryCreate
from app.schemas.ai_project import AIProject, AIProjectCreate, AIProjectUpdate
from app.schemas.ai_demo import AIDemo, AIDemoCreate, AIDemoUpdate

__all__ = [
    "User",
    "UserCreate",
    "UserLogin",
    "Token",
    "Blog",
    "BlogCreate",
    "BlogUpdate",
    "Category",
    "CategoryCreate",
    "Tag",
    "TagCreate",
    "Photo",
    "PhotoCreate",
    "PhotoUpdate",
    "PhotoCategory",
    "PhotoCategoryCreate",
    "AIProject",
    "AIProjectCreate",
    "AIProjectUpdate",
    "AIDemo",
    "AIDemoCreate",
    "AIDemoUpdate",
]

