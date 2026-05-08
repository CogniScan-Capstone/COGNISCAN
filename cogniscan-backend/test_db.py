import asyncio
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

# Load environment variables
load_dotenv()

# Ambil dan modifikasi URL untuk menggunakan asyncpg
# Mengubah postgresql:// menjadi postgresql+asyncpg://
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
    DATABASE_URL = DATABASE_URL.replace("?pgbouncer=true", "")

import uuid
from sqlalchemy.pool import NullPool

# Buat async engine
async_engine = create_async_engine(
    DATABASE_URL, 
    echo=True,
    poolclass=NullPool,
    connect_args={
        "statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid.uuid4().hex}__"
    }
)

async def test_async_connection():
    try:
        # Mencoba membuka koneksi async
        async with async_engine.begin() as conn:
            result = await conn.execute(text("SELECT version();"))
            db_version = result.fetchone()
            print("\n" + "="*50)
            print("KONEKSI ASYNC BERHASIL!")
            print(f"Versi Database: {db_version[0]}")
            print("="*50 + "\n")
    except Exception as e:
        print("\n" + "="*50)
        print("KONEKSI ASYNC GAGAL!")
        print(f"Error: {e}")
        print("="*50 + "\n")

if __name__ == "__main__":
    # Jalankan event loop untuk fungsi async
    asyncio.run(test_async_connection())
