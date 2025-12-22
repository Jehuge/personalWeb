"""
通用投票 API（点赞/拉踩）
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.vote import Vote
from app.models.blog import Blog
from app.models.photo import Photo
from app.models.video import Video
from app.models.ai_image import AIImage
from app.models.ai_demo import AIDemo
from app.schemas.vote import VoteCreate, VoteStatus

router = APIRouter(prefix="/votes", tags=["Vote"])

# mapping from content_type string to (ModelClass, like_field, dislike_field)
CONTENT_MAP = {
    "blog": (Blog, "like_count", "dislike_count"),
    "photo": (Photo, "like_count", "dislike_count"),
    "video": (Video, "like_count", "dislike_count"),
    "ai_image": (AIImage, "like_count", "dislike_count"),
    "ai_demo": (AIDemo, "like_count", "dislike_count"),
}


async def _get_model_and_counts(db: AsyncSession, content_type: str, content_id: int):
    mapping = CONTENT_MAP.get(content_type)
    if not mapping:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="未知的 content_type")
    model_cls, like_field, dislike_field = mapping
    result = await db.execute(select(model_cls).where(model_cls.id == content_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="内容不存在")
    like_count = getattr(item, like_field, 0) or 0
    dislike_count = getattr(item, dislike_field, 0) or 0
    return item, like_field, dislike_field, like_count, dislike_count


@router.post("", response_model=VoteStatus)
async def vote(
    vote_in: VoteCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    提交一次投票。非登录用户也可提交，需要前端提供 X-Visitor-Id header（若无则使用 User-Agent）
    """
    visitor_id = request.headers.get("X-Visitor-Id")
    user_agent = request.headers.get("User-Agent")
    ip = None
    if request.client:
        ip = request.client.host

    content_type = vote_in.content_type
    content_id = vote_in.content_id
    action = 1 if vote_in.action >= 1 else -1

    # 找到目标对象
    item, like_field, dislike_field, like_count, dislike_count = await _get_model_and_counts(db, content_type, content_id)

    # 判定唯一标识：优先 visitor_id，否则使用 user_agent+ip
    visitor_key = visitor_id or f"ua:{user_agent}"

    # 查询是否已投票
    existing_q = select(Vote).where(
        Vote.content_type == content_type,
        Vote.content_id == content_id,
        Vote.visitor_id == visitor_key,
    )
    existing_res = await db.execute(existing_q)
    existing_vote = existing_res.scalar_one_or_none()

    try:
        if existing_vote:
            if existing_vote.action == action:
                # 已投相同选项，不重复计数
                return VoteStatus(action=existing_vote.action, like_count=like_count, dislike_count=dislike_count)
            # 更新已有记录，并调整计数
            prev_action = existing_vote.action
            existing_vote.action = action
            # adjust counts on item
            if prev_action == 1:
                setattr(item, like_field, max((getattr(item, like_field) or 0) - 1, 0))
            else:
                setattr(item, dislike_field, max((getattr(item, dislike_field) or 0) - 1, 0))

            if action == 1:
                setattr(item, like_field, (getattr(item, like_field) or 0) + 1)
            else:
                setattr(item, dislike_field, (getattr(item, dislike_field) or 0) + 1)

            await db.commit()
            # refresh counts
            like_count = getattr(item, like_field) or 0
            dislike_count = getattr(item, dislike_field) or 0
            return VoteStatus(action=action, like_count=like_count, dislike_count=dislike_count)
        else:
            # 新投票
            db_vote = Vote(
                content_type=content_type,
                content_id=content_id,
                action=action,
                visitor_id=visitor_key,
                user_agent=user_agent,
                ip=ip,
            )
            db.add(db_vote)
            # 更新目标计数
            if action == 1:
                setattr(item, like_field, (getattr(item, like_field) or 0) + 1)
            else:
                setattr(item, dislike_field, (getattr(item, dislike_field) or 0) + 1)

            await db.commit()
            like_count = getattr(item, like_field) or 0
            dislike_count = getattr(item, dislike_field) or 0
            return VoteStatus(action=action, like_count=like_count, dislike_count=dislike_count)
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="投票失败")


@router.get("/status", response_model=VoteStatus)
async def vote_status(
    content_type: str,
    content_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    查询当前访客对某条内容的投票状态以及当前计数
    """
    visitor_id = request.headers.get("X-Visitor-Id")
    user_agent = request.headers.get("User-Agent")
    visitor_key = visitor_id or f"ua:{user_agent}"

    item, like_field, dislike_field, like_count, dislike_count = await _get_model_and_counts(db, content_type, content_id)

    existing_q = select(Vote).where(
        Vote.content_type == content_type,
        Vote.content_id == content_id,
        Vote.visitor_id == visitor_key,
    )
    existing_res = await db.execute(existing_q)
    existing_vote = existing_res.scalar_one_or_none()

    action = existing_vote.action if existing_vote else None
    return VoteStatus(action=action, like_count=like_count, dislike_count=dislike_count)


