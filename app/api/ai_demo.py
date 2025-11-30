"""
AI Demo API 路由
"""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_active_user
from app.core.database import get_db
from app.models.ai_demo import AIDemo
from app.models.user import User
from app.schemas.ai_demo import (
    AIDemo as AIDemoSchema,
    AIDemoCreate,
    AIDemoUpdate,
)

router = APIRouter(prefix="/ai-demos", tags=["AI Demo"])


@router.get("", response_model=List[AIDemoSchema])
async def list_ai_demos(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=200),
    is_featured: Optional[bool] = None,
    category: Optional[str] = None,
    published_only: bool = Query(False, description="只返回已发布的 Demo"),
    db: AsyncSession = Depends(get_db),
):
    """获取 AI Demo 列表"""
    query = select(AIDemo)

    if published_only:
        query = query.where(AIDemo.is_published == True)  # noqa: E712

    if is_featured is not None:
        query = query.where(AIDemo.is_featured == is_featured)

    if category:
        query = query.where(AIDemo.category == category)

    query = query.order_by(AIDemo.sort_order.asc(), AIDemo.created_at.desc())
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{demo_id}", response_model=AIDemoSchema)
async def get_ai_demo(demo_id: int, db: AsyncSession = Depends(get_db)):
    """获取单个 Demo"""
    try:
        result = await db.execute(select(AIDemo).where(AIDemo.id == demo_id))
        demo = result.scalar_one_or_none()

        if not demo:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Demo 不存在",
            )

        # 增加浏览量（异步更新，不阻塞返回）
        try:
            demo.view_count = (demo.view_count or 0) + 1
            await db.commit()
            await db.refresh(demo)
        except Exception as e:
            # 如果更新浏览量失败，回滚但不影响返回数据
            await db.rollback()
            # 重新查询以获取最新数据
            result = await db.execute(select(AIDemo).where(AIDemo.id == demo_id))
            demo = result.scalar_one()
            print(f"更新浏览量失败，已回滚: {e}")

        return demo
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取 Demo 详情失败: {error_msg}"
        )


@router.post("", response_model=AIDemoSchema, status_code=status.HTTP_201_CREATED)
async def create_ai_demo(
    demo_data: AIDemoCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """创建 Demo（需要登录）"""
    result = await db.execute(select(AIDemo).where(AIDemo.slug == demo_data.slug))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demo slug 已存在",
        )

    demo_dict = demo_data.dict()

    if not demo_dict.get("bundle_path"):
        demo_dict["bundle_path"] = demo_dict["slug"]

    if demo_dict.get("is_published"):
        demo_dict["published_at"] = datetime.utcnow()

    db_demo = AIDemo(**demo_dict)
    db.add(db_demo)
    await db.commit()
    await db.refresh(db_demo)
    return db_demo


@router.put("/{demo_id}", response_model=AIDemoSchema)
async def update_ai_demo(
    demo_id: int,
    demo_data: AIDemoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """更新 Demo（需要登录）"""
    result = await db.execute(select(AIDemo).where(AIDemo.id == demo_id))
    db_demo = result.scalar_one_or_none()

    if not db_demo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo 不存在",
        )

    update_data = demo_data.dict(exclude_unset=True)

    if "slug" in update_data and update_data["slug"] != db_demo.slug:
        result = await db.execute(select(AIDemo).where(AIDemo.slug == update_data["slug"]))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Demo slug 已存在",
            )

    if "is_published" in update_data:
        if update_data["is_published"] and not db_demo.published_at:
            update_data["published_at"] = datetime.utcnow()
        elif not update_data["is_published"]:
            update_data["published_at"] = None

    if "bundle_path" in update_data and not update_data["bundle_path"]:
        update_data["bundle_path"] = update_data.get("slug", db_demo.slug)

    for field, value in update_data.items():
        setattr(db_demo, field, value)

    await db.commit()
    await db.refresh(db_demo)
    return db_demo


@router.delete("/{demo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ai_demo(
    demo_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """删除 Demo（需要登录）"""
    result = await db.execute(select(AIDemo).where(AIDemo.id == demo_id))
    db_demo = result.scalar_one_or_none()

    if not db_demo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo 不存在",
        )

    await db.delete(db_demo)
    await db.commit()
    return None








