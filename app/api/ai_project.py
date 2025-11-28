"""
AI项目API路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.api.dependencies import get_current_active_user
from app.models.user import User
from app.models.ai_project import AIProject
from app.schemas.ai_project import (
    AIProject as AIProjectSchema,
    AIProjectCreate,
    AIProjectUpdate
)

router = APIRouter(prefix="/ai-projects", tags=["AI项目"])


@router.get("", response_model=List[AIProjectSchema])
async def get_ai_projects(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    is_featured: Optional[bool] = None,
    published_only: bool = Query(False, description="是否只返回已发布的项目"),
    db: AsyncSession = Depends(get_db)
):
    """获取AI项目列表"""
    query = select(AIProject)
    
    if published_only:
        query = query.where(AIProject.is_published == True)
    
    if is_featured is not None:
        query = query.where(AIProject.is_featured == is_featured)
    
    query = query.order_by(AIProject.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{project_id}", response_model=AIProjectSchema)
async def get_ai_project(project_id: int, db: AsyncSession = Depends(get_db)):
    """获取单个AI项目"""
    result = await db.execute(select(AIProject).where(AIProject.id == project_id))
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI项目不存在"
        )
    
    # 增加浏览量
    project.view_count += 1
    await db.commit()
    
    return project


@router.post("", response_model=AIProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_ai_project(
    project_data: AIProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """创建AI项目（需要登录）"""
    # 检查slug是否已存在
    result = await db.execute(
        select(AIProject).where(AIProject.slug == project_data.slug)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="项目slug已存在"
        )
    
    project_dict = project_data.dict()
    if project_dict.get("is_published"):
        project_dict["published_at"] = datetime.utcnow()
    
    db_project = AIProject(**project_dict)
    db.add(db_project)
    await db.commit()
    await db.refresh(db_project)
    return db_project


@router.put("/{project_id}", response_model=AIProjectSchema)
async def update_ai_project(
    project_id: int,
    project_data: AIProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """更新AI项目（需要登录）"""
    result = await db.execute(select(AIProject).where(AIProject.id == project_id))
    db_project = result.scalar_one_or_none()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI项目不存在"
        )
    
    # 更新字段
    update_data = project_data.dict(exclude_unset=True)
    
    # 处理slug唯一性检查
    if "slug" in update_data and update_data["slug"] != db_project.slug:
        result = await db.execute(
            select(AIProject).where(AIProject.slug == update_data["slug"])
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="项目slug已存在"
            )
    
    # 处理发布状态
    if "is_published" in update_data:
        if update_data["is_published"] and not db_project.published_at:
            update_data["published_at"] = datetime.utcnow()
        elif not update_data["is_published"]:
            update_data["published_at"] = None
    
    for field, value in update_data.items():
        setattr(db_project, field, value)
    
    await db.commit()
    await db.refresh(db_project)
    return db_project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """删除AI项目（需要登录）"""
    result = await db.execute(select(AIProject).where(AIProject.id == project_id))
    db_project = result.scalar_one_or_none()
    
    if not db_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI项目不存在"
        )
    
    await db.delete(db_project)
    await db.commit()
    return None




