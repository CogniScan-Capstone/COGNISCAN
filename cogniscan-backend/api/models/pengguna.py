"""
Model Pengguna — tabel dasar autentikasi.
Primary key: UUID (sesuai schema Supabase).
"""

from __future__ import annotations

import uuid as uuid_module
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.admin import Admin
    from api.models.log_persetujuan import LogPersetujuan
    from api.models.pasien import Pasien
    from api.models.psikolog import Psikolog


class Pengguna(Base):
    __tablename__ = "pengguna"

    id: Mapped[uuid_module.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid_module.uuid4
    )
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    peran: Mapped[str | None] = mapped_column(
        Text, nullable=True,
        comment="'pasien', 'psikolog', 'admin'"
    )
    apakah_aktif: Mapped[bool | None] = mapped_column(Boolean, default=True)
    dibuat_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    pasien: Mapped[Pasien] = relationship(back_populates="pengguna", uselist=False)
    psikolog: Mapped[Psikolog] = relationship(back_populates="pengguna", uselist=False)
    admin: Mapped[Admin] = relationship(back_populates="pengguna", uselist=False)
    log_persetujuan: Mapped[list[LogPersetujuan]] = relationship(back_populates="pengguna")
