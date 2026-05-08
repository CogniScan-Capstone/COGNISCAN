"""
Model Admin — extends Pengguna (one-to-one).

Admin bertanggung jawab untuk verifikasi psikolog dan manajemen sistem.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class Admin(Base):
    """Profil admin sistem CogniScan."""

    __tablename__ = "admin"

    id_admin: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_pengguna: Mapped[int] = mapped_column(
        ForeignKey("pengguna.id_pengguna", ondelete="CASCADE"), unique=True, nullable=False
    )
    level: Mapped[str] = mapped_column(
        String(20), default="admin", comment="'admin', 'super_admin'"
    )
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ──────────────────────────────────────
    pengguna: Mapped["Pengguna"] = relationship(back_populates="admin")
