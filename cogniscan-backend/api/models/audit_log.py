"""
Model AuditLog - jejak formal aktivitas sensitif lintas role.
"""

from __future__ import annotations

import uuid as uuid_module

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from api.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id_audit_log: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_aktor: Mapped[uuid_module.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("pengguna.id", ondelete="SET NULL"),
        nullable=True,
    )
    email_aktor: Mapped[str | None] = mapped_column(Text, nullable=True)
    peran_aktor: Mapped[str | None] = mapped_column(Text, nullable=True)
    aksi: Mapped[str] = mapped_column(Text, nullable=False)
    target_tipe: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="success", nullable=False)
    ip_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    dibuat_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
