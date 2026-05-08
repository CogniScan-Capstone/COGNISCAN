"""
Setup SQLAlchemy async engine dan session factory untuk Supabase.

PENTING:
- Pakai NullPool karena Supabase PgBouncer (transaction mode)
  tidak support prepared statements.
- SSL wajib untuk Supabase.
- server_settings jit=off untuk kompatibilitas PgBouncer.
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import pool

from api.core.config import settings


# ── Async Engine (untuk FastAPI runtime) ───────────────────
# Pakai Transaction Pooler (port 6543) via DATABASE_URL
engine = create_async_engine(
    settings.async_database_url,
    poolclass=pool.NullPool,  # WAJIB untuk PgBouncer transaction mode
    echo=settings.DEBUG,      # Log SQL queries saat development
    connect_args={
        "ssl": "require",     # Supabase wajib SSL
        "server_settings": {
            "jit": "off",     # PgBouncer tidak support JIT
        },
    },
)

# ── Session Factory ────────────────────────────────────────
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Object tetap bisa diakses setelah commit
)


# ── Base Class untuk semua ORM Models ──────────────────────
class Base(DeclarativeBase):
    """Base class untuk semua SQLAlchemy models CogniScan."""
    pass
