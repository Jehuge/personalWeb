"""
博客API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.models.blog import Blog, Category, Tag
from app.schemas.blog import (
    Blog as BlogSchema,
    BlogCreate,
    BlogUpdate,
    Category as CategorySchema,
    CategoryCreate,
    Tag as TagSchema,
    TagCreate
)

router = APIRouter(prefix="/blogs", tags=["博客"])


# ========== 博客分类管理 ==========
@router.get("/categories", response_model=List[CategorySchema])
async def get_categories(db: AsyncSession = Depends(get_db)):
    """获取所有分类"""
    result = await db.execute(select(Category).order_by(Category.created_at))
    return result.scalars().all()


@router.post("/categories", response_model=CategorySchema, status_code=status.HTTP_201_CREATED)
async def create_category(
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建分类（需要登录）"""
    # 检查slug是否已存在
    result = await db.execute(select(Category).where(Category.slug == category_data.slug))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="分类slug已存在"
        )
    
    db_category = Category(**category_data.dict())
    db.add(db_category)
    await db.commit()
    await db.refresh(db_category)
    return db_category


@router.put("/categories/{category_id}", response_model=CategorySchema)
async def update_category(
    category_id: int,
    category_data: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新分类（需要登录）"""
    result = await db.execute(select(Category).where(Category.id == category_id))
    db_category = result.scalar_one_or_none()
    
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在"
        )
    
    # 检查slug唯一性
    if category_data.slug != db_category.slug:
        result = await db.execute(select(Category).where(Category.slug == category_data.slug))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类slug已存在"
            )
    
    for field, value in category_data.dict().items():
        setattr(db_category, field, value)
    
    await db.commit()
    await db.refresh(db_category)
    return db_category


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除分类（需要登录）"""
    result = await db.execute(select(Category).where(Category.id == category_id))
    db_category = result.scalar_one_or_none()
    
    if not db_category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分类不存在"
        )
    
    await db.delete(db_category)
    await db.commit()
    return None


# ========== 标签管理 ==========
@router.get("/tags", response_model=List[TagSchema])
async def get_tags(db: AsyncSession = Depends(get_db)):
    """获取所有标签"""
    result = await db.execute(select(Tag).order_by(Tag.created_at))
    return result.scalars().all()


@router.post("/tags", response_model=TagSchema, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建标签（需要登录）"""
    # 检查slug是否已存在
    result = await db.execute(select(Tag).where(Tag.slug == tag_data.slug))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="标签slug已存在"
        )
    
    db_tag = Tag(**tag_data.dict())
    db.add(db_tag)
    await db.commit()
    await db.refresh(db_tag)
    return db_tag


@router.put("/tags/{tag_id}", response_model=TagSchema)
async def update_tag(
    tag_id: int,
    tag_data: TagCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新标签（需要登录）"""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    db_tag = result.scalar_one_or_none()
    
    if not db_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="标签不存在"
        )
    
    # 检查slug唯一性
    if tag_data.slug != db_tag.slug:
        result = await db.execute(select(Tag).where(Tag.slug == tag_data.slug))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="标签slug已存在"
            )
    
    for field, value in tag_data.dict().items():
        setattr(db_tag, field, value)
    
    await db.commit()
    await db.refresh(db_tag)
    return db_tag


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除标签（需要登录）"""
    result = await db.execute(select(Tag).where(Tag.id == tag_id))
    db_tag = result.scalar_one_or_none()
    
    if not db_tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="标签不存在"
        )
    
    await db.delete(db_tag)
    await db.commit()
    return None


# ========== 博客文章管理 ==========
@router.get("", response_model=List[BlogSchema])
async def get_blogs(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    category_id: Optional[int] = None,
    tag_id: Optional[int] = None,
    search: Optional[str] = None,
    published_only: bool = Query(False, description="是否只返回已发布的文章"),
    db: AsyncSession = Depends(get_db)
):
    """获取博客列表"""
    query = select(Blog).options(
        selectinload(Blog.category),
        selectinload(Blog.tags)
    )
    
    # 过滤条件
    if published_only:
        query = query.where(Blog.is_published == True)
    
    if category_id:
        query = query.where(Blog.category_id == category_id)
    
    if tag_id:
        query = query.join(Blog.tags).where(Tag.id == tag_id)
    
    if search:
        query = query.where(
            or_(
                Blog.title.contains(search),
                Blog.content.contains(search),
                Blog.excerpt.contains(search)
            )
        )
    
    query = query.order_by(Blog.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().unique().all()


@router.get("/{blog_id}", response_model=BlogSchema)
async def get_blog(blog_id: int, db: AsyncSession = Depends(get_db)):
    """获取单篇博客"""
    result = await db.execute(
        select(Blog)
        .options(selectinload(Blog.category), selectinload(Blog.tags))
        .where(Blog.id == blog_id)
    )
    blog = result.scalar_one_or_none()
    
    if not blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="博客不存在"
        )
    
    # 增加浏览量
    blog.view_count += 1
    await db.commit()
    
    return blog


@router.post("", response_model=BlogSchema, status_code=status.HTTP_201_CREATED)
async def create_blog(
    blog_data: BlogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建博客（需要登录）"""
    # 检查slug是否已存在
    result = await db.execute(select(Blog).where(Blog.slug == blog_data.slug))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="博客slug已存在"
        )
    
    # 检查分类是否存在
    if blog_data.category_id:
        result = await db.execute(select(Category).where(Category.id == blog_data.category_id))
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分类不存在"
            )
    
    # 创建博客
    blog_dict = blog_data.dict()
    tag_ids = blog_dict.pop("tag_ids", [])
    
    db_blog = Blog(
        **blog_dict,
        author_id=current_user.id,
        published_at=datetime.utcnow() if blog_data.is_published else None
    )
    
    # 添加标签
    if tag_ids:
        result = await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        tags = result.scalars().all()
        if len(tags) != len(tag_ids):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="部分标签不存在"
            )
        db_blog.tags = tags
    
    db.add(db_blog)
    await db.commit()
    await db.refresh(db_blog)
    
    # 重新加载关联数据
    result = await db.execute(
        select(Blog)
        .options(selectinload(Blog.category), selectinload(Blog.tags))
        .where(Blog.id == db_blog.id)
    )
    return result.scalar_one()


@router.put("/{blog_id}", response_model=BlogSchema)
async def update_blog(
    blog_id: int,
    blog_data: BlogUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新博客（需要登录）"""
    result = await db.execute(
        select(Blog)
        .options(selectinload(Blog.category), selectinload(Blog.tags))
        .where(Blog.id == blog_id)
    )
    db_blog = result.scalar_one_or_none()
    
    if not db_blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="博客不存在"
        )
    
    # 检查权限（只有作者或超级用户可以修改）
    if db_blog.author_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权修改此博客"
        )
    
    # 更新字段
    update_data = blog_data.dict(exclude_unset=True)
    
    # 处理slug唯一性检查
    if "slug" in update_data and update_data["slug"] != db_blog.slug:
        result = await db.execute(select(Blog).where(Blog.slug == update_data["slug"]))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="博客slug已存在"
            )
    
    # 处理分类
    if "category_id" in update_data:
        if update_data["category_id"]:
            result = await db.execute(
                select(Category).where(Category.id == update_data["category_id"])
            )
            if not result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="分类不存在"
                )
    
    # 处理标签
    if "tag_ids" in update_data:
        tag_ids = update_data.pop("tag_ids")
        if tag_ids is not None:
            result = await db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
            tags = result.scalars().all()
            if len(tags) != len(tag_ids):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="部分标签不存在"
                )
            db_blog.tags = tags
    
    # 处理发布状态
    if "is_published" in update_data:
        if update_data["is_published"] and not db_blog.published_at:
            update_data["published_at"] = datetime.utcnow()
        elif not update_data["is_published"]:
            update_data["published_at"] = None
    
    # 更新其他字段
    for field, value in update_data.items():
        setattr(db_blog, field, value)
    
    await db.commit()
    await db.refresh(db_blog)
    
    # 重新加载关联数据
    result = await db.execute(
        select(Blog)
        .options(selectinload(Blog.category), selectinload(Blog.tags))
        .where(Blog.id == db_blog.id)
    )
    return result.scalar_one()


@router.delete("/{blog_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_blog(
    blog_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除博客（需要登录）"""
    result = await db.execute(select(Blog).where(Blog.id == blog_id))
    db_blog = result.scalar_one_or_none()
    
    if not db_blog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="博客不存在"
        )
    
    # 检查权限
    if db_blog.author_id != current_user.id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="无权删除此博客"
        )
    
    await db.delete(db_blog)
    await db.commit()
    return None

