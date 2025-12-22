from pydantic import BaseModel
from typing import Optional


class VoteCreate(BaseModel):
    content_type: str
    content_id: int
    action: int  # 1 = like, -1 = dislike


class VoteStatus(BaseModel):
    action: Optional[int]
    like_count: int
    dislike_count: int


