"""
Model ReminderKonsultasi - log pengiriman reminder konsultasi pasien.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.pemesanan_konsultasi import PemesananKonsultasi


class ReminderKonsultasi(Base):
    __tablename__ = "reminder_konsultasi"

    id_reminder_konsultasi: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    id_pemesanan_konsultasi: Mapped[int] = mapped_column(
        ForeignKey("pemesanan_konsultasi.id_pemesanan_konsultasi"),
        nullable=False,
    )
    tipe_reminder: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[str] = mapped_column(Text, default="whatsapp", nullable=False)
    status: Mapped[str] = mapped_column(Text, default="pending", nullable=False)
    dikirim_pada: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    dibuat_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    pemesanan: Mapped["PemesananKonsultasi"] = relationship(
        back_populates="reminder_konsultasi",
    )
