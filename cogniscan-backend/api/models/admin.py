"""
Model Admin — extends Pengguna (FK UUID).
"""

from __future__ import annotations

import uuid as uuid_module
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.pengguna import Pengguna
    from api.models.psikolog import Psikolog


class Admin(Base):
    __tablename__ = "admin"

    id_admin: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pengguna: Mapped[uuid_module.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pengguna.id"), nullable=True
    )
    nama_lengkap: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    dibuat_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    pengguna: Mapped[Pengguna] = relationship(back_populates="admin")
    psikolog_terdaftar: Mapped[list[Psikolog]] = relationship(back_populates="admin")