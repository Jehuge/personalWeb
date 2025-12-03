import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def migrate():
    db_url = settings.DATABASE_URL
    print(f"Connecting to {db_url}")
    engine = create_async_engine(db_url, echo=True)
    
    async with engine.begin() as conn:
        try:
            print("Checking if column exists...")
            # Check if column exists
            result = await conn.execute(text(
                "SELECT count(*) FROM information_schema.columns "
                "WHERE table_schema = 'personal_web' "
                "AND table_name = 'ai_images' "
                "AND column_name = 'thumbnail_url'"
            ))
            exists = result.scalar()
            
            if not exists:
                print("Adding thumbnail_url column...")
                await conn.execute(text(
                    "ALTER TABLE ai_images ADD COLUMN thumbnail_url VARCHAR(500) DEFAULT NULL"
                ))
                print("Column added successfully.")
            else:
                print("Column already exists.")
                
        except Exception as e:
            print(f"Migration failed: {e}")
            
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(migrate())
