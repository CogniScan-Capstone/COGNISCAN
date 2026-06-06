"""
Setup SQLAlchemy async engine dan session factory untuk Supabase.

PENTING:
- Pakai NullPool karena Supabase PgBouncer transaction mode tidak support
  prepared statements yang dipertahankan antar koneksi.
- SSL wajib untuk Supabase.
- Matikan statement cache asyncpg untuk kompatibilitas PgBouncer.
"""

from uuid import uuid4

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from api.core.config import settings


# Async engine untuk FastAPI runtime.
# Pakai Transaction Pooler (port 6543) via DATABASE_URL.
engine = create_async_engine(
    settings.async_database_url,
    poolclass=pool.NullPool,
    echo=settings.SQL_ECHO,
    connect_args={
        "ssl": "require",
        "statement_cache_size": 0,
        "prepared_statement_name_func": lambda: f"__asyncpg_{uuid4().hex}__",
        "server_settings": {
            "jit": "off",
        },
    },
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class untuk semua SQLAlchemy models CogniScan."""

    pass
