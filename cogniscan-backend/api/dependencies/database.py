from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from api.core.database import async_session_factory

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency untuk mendapatkan session database async.
    Digunakan dengan FastAPI Depends().
    """
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()
