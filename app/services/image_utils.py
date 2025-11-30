from datetime import datetime
from pathlib import Path
import uuid
from typing import Any, Optional

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB


def _validate_content_type(content_type: Optional[str]):
    if content_type not in ALLOWED_IMAGE_TYPES:
        allowed = ", ".join(sorted(ALLOWED_IMAGE_TYPES))
        raise ValueError(f"不支持的文件类型，仅支持: {allowed}")


async def read_image_bytes(file: Any) -> bytes:
    _validate_content_type(file.content_type)
    try:
        content = await file.read()
    except Exception as exc:
        raise ValueError(f"读取文件失败: {exc}") from exc

    if len(content) > MAX_IMAGE_SIZE:
        raise ValueError("文件大小超过10MB限制")

    return content


def generate_image_path(filename: Optional[str]) -> str:
    file_ext = Path(filename or "").suffix.lower() or ".jpg"
    date_str = datetime.now().strftime("%Y/%m")
    file_name = f"{uuid.uuid4().hex}{file_ext}"
    return f"images/{date_str}/{file_name}"


