"""
数据库初始化脚本
支持SQLite和MySQL
"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.database import Base
from app.core.config import settings
from app.models import user, blog, photo, ai_project, ai_demo, ai_image  # noqa


async def init_db():
    """初始化数据库，创建所有表"""
    db_url = settings.DATABASE_URL
    print(f"正在连接数据库: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    
    # 对于MySQL，需要先创建数据库（如果不存在）
    if 'mysql' in db_url.lower():
        try:
            # 从连接URL中提取数据库名
            db_name = db_url.split('/')[-1].split('?')[0]
            # 创建不指定数据库的连接来执行CREATE DATABASE
            base_url = '/'.join(db_url.split('/')[:-1])
            temp_engine = create_async_engine(base_url, echo=False)
            
            async with temp_engine.begin() as temp_conn:
                from sqlalchemy import text
                # 检查数据库是否存在，如果不存在则创建
                await temp_conn.execute(
                    text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` "
                         f"DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci")
                )
            await temp_engine.dispose()
            print(f"数据库 '{db_name}' 已准备就绪")
        except Exception as e:
            print(f"警告: 无法自动创建数据库，请手动创建: {e}")
            print(f"可以执行: CREATE DATABASE IF NOT EXISTS `{db_name}` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;")
    
    # 创建所有表
    engine = create_async_engine(db_url, echo=True)
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    await engine.dispose()
    print("数据库表结构初始化完成！")


if __name__ == "__main__":
    asyncio.run(init_db())
