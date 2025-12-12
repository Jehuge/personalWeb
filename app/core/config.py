from pydantic_settings import BaseSettings
from typing import List, Union
import json


class Settings(BaseSettings):
    # 应用配置
    APP_NAME: str = "个人网站"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # 数据库配置
    # SQLite: sqlite+aiosqlite:///./personal_web.db
    # MySQL: mysql+asyncmy://user:password@localhost:3306/personal_web
    DATABASE_URL: str = "mysql+asyncmy://root:12345678@localhost:3306/personal_web"
    
    # JWT配置
    SECRET_KEY: str = "your-secret-key-here-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # OSS配置
    OSS_ACCESS_KEY_ID: str = ""
    OSS_ACCESS_KEY_SECRET: str = ""
    OSS_ENDPOINT: str = "oss-cn-hangzhou.aliyuncs.com"
    OSS_BUCKET_NAME: str = ""
    OSS_BASE_URL: str = ""
    
    # CORS配置
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:3000", "http://localhost:5173"]
    
    # 图片访问特殊码
    NSFW_ACCESS_CODE: str = ""
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # 处理CORS_ORIGINS，支持JSON字符串或列表
        if isinstance(self.CORS_ORIGINS, str):
            try:
                self.CORS_ORIGINS = json.loads(self.CORS_ORIGINS)
            except json.JSONDecodeError:
                # 如果不是JSON，按逗号分割
                self.CORS_ORIGINS = [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

