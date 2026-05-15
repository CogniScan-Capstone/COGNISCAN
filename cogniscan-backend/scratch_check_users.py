import asyncio
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from api.core.config import settings

async def main():
    engine = create_async_engine(settings.async_database_url)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if table exists
        try:
            result = await session.execute(text("SELECT id, email, peran FROM pengguna"))
            users = result.fetchall()
            print("=== DATA DI TABEL PENGGUNA ===")
            if not users:
                print("Tabel pengguna KOSONG.")
            for u in users:
                print(f"ID: {u.id} | Email: {u.email} | Peran: {u.peran}")
        except Exception as e:
            print("Error query tabel pengguna:", e)

if __name__ == "__main__":
    asyncio.run(main())
