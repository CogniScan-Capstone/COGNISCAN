"""
Model LogPersetujuan — compliance UU PDP.
"""

from __future__ import annotations

import uuid as uuid_module
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.pengguna import Pengguna


class LogPersetujuan(Base):
    __tablename__ = "log_persetujuan"

    id_log_persetujuan: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pengguna: Mapped[uuid_module.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pengguna.id"), nullable=True
    )
    apakah_setuju: Mapped[bool | None] = mapped_column(Boolean, default=True)
    disetujui_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    pengguna: Mapped[Pengguna] = relationship(back_populates="log_persetujuan")
