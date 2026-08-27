import asyncio
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal
from app.models import UserRole,User
from app.security import hash_password


async def seed_users() -> None:
    async with AsyncSessionLocal() as session:
        session.add_all([
            User(username = "admin", hashed_password= hash_password("AdminPass123!"), role = UserRole.CLINIAL_ADMIN),
            User(username = "technician", hashed_password= hash_password("TechnicianPass123!"), role = UserRole.FIELD_TECHNICIAN),
            User(username = "auditor ", hashed_password= hash_password("AuditorPass123!"), role = UserRole.AUDITOR)
        ])
        await session.commit()
        
if __name__ == "__main__":
    asyncio.run(seed_users())