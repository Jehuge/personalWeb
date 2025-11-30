#!/usr/bin/env python3
"""
快速创建管理员用户脚本
用法: 
  python3 create_admin.py <username> <email> <password>              # 直接创建到数据库
  python3 create_admin.py <username> <email> <password> --sql-only    # 只生成SQL语句
"""
import sys
import asyncio
from sqlalchemy import select
from app.core.security import get_password_hash
from app.core.database import AsyncSessionLocal
from app.models.user import User

async def create_admin_user(username: str, email: str, password: str, sql_only: bool = False):
    """创建管理员用户"""
    hashed_password = get_password_hash(password)
    
    if sql_only:
        # 只生成SQL语句
        print("\n=== SQL 插入语句 ===")
        print(f"""
INSERT INTO users (username, email, hashed_password, is_active, is_superuser)
VALUES ('{username}', '{email}', '{hashed_password}', 1, 1);
""")
        print("\n=== 或者使用 curl 注册后更新 ===")
        print(f"""
# 1. 先注册用户
curl -X POST "http://localhost:8000/api/auth/register" \\
  -H "Content-Type: application/json" \\
  -d '{{"username": "{username}", "email": "{email}", "password": "{password}"}}'

# 2. 然后设置为管理员
mysql -u root -p personal_web -e "UPDATE users SET is_superuser=1 WHERE username='{username}';"
""")
        return
    
    # 直接创建到数据库
    async with AsyncSessionLocal() as db:
        try:
            # 检查用户是否已存在
            result = await db.execute(select(User).where(User.username == username))
            existing_user = result.scalar_one_or_none()
            
            if existing_user:
                # 如果存在，更新为管理员
                existing_user.hashed_password = hashed_password
                existing_user.email = email
                existing_user.is_superuser = True
                existing_user.is_active = True
                await db.commit()
                print(f"✓ 用户 '{username}' 已存在，已更新为管理员")
            else:
                # 创建新管理员
                db_user = User(
                    username=username,
                    email=email,
                    hashed_password=hashed_password,
                    is_active=True,
                    is_superuser=True
                )
                db.add(db_user)
                await db.commit()
                await db.refresh(db_user)
                print(f"✓ 管理员用户 '{username}' 创建成功！")
            
            print(f"  用户名: {username}")
            print(f"  邮箱: {email}")
            print(f"  是否管理员: 是")
        except Exception as e:
            print(f"✗ 创建失败: {e}")
            await db.rollback()
            raise

if __name__ == "__main__":
    sql_only = "--sql-only" in sys.argv
    args = [arg for arg in sys.argv[1:] if arg != "--sql-only"]
    
    if len(args) != 3:
        print("用法:")
        print("  python3 create_admin.py <username> <email> <password>              # 直接创建到数据库")
        print("  python3 create_admin.py <username> <email> <password> --sql-only  # 只生成SQL语句")
        print("\n示例:")
        print("  python3 create_admin.py admin admin@example.com admin123")
        print("  python3 create_admin.py admin admin@example.com admin123 --sql-only")
        sys.exit(1)
    
    username, email, password = args
    asyncio.run(create_admin_user(username, email, password, sql_only))

