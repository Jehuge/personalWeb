from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from app.core.config import settings

# bcrypt 最多支持 72 字节
BCRYPT_MAX_LENGTH = 72


def _truncate_password(password: str) -> bytes:
    """截断密码到 bcrypt 支持的最大长度"""
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > BCRYPT_MAX_LENGTH:
        password_bytes = password_bytes[:BCRYPT_MAX_LENGTH]
    return password_bytes


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    try:
        password_bytes = _truncate_password(plain_password)
        # 确保 hashed_password 是字节
        if isinstance(hashed_password, str):
            hashed_bytes = hashed_password.encode('utf-8')
        else:
            hashed_bytes = hashed_password
        
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    password_bytes = _truncate_password(password)
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """创建JWT访问令牌"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[dict]:
    """解码JWT令牌"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None

