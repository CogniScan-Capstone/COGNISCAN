"""
Model JadwalPsikolog — slot konsultasi psikolog.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, ForeignKey, Integer, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.pemesanan_konsultasi import PemesananKonsultasi
    from api.models.psikolog import Psikolog


class JadwalPsikolog(Base):
    __tablename__ = "jadwal_psikolog"

    id_jadwal_psikolog: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_psikolog: Mapped[int | None] = mapped_column(ForeignKey("psikolog.id_psikolog"), nullable=True)
    tanggal_praktik: Mapped[str | None] = mapped_column(Date, nullable=True)
    waktu_mulai: Mapped[str | None] = mapped_column(Time, nullable=True)
    waktu_selesai: Mapped[str | None] = mapped_column(Time, nullable=True)
    apakah_tersedia: Mapped[bool | None] = mapped_column(Boolean, default=True)

    # Relationships
    psikolog: Mapped[Psikolog] = relationship(back_populates="jadwal")
    pemesanan: Mapped[PemesananKonsultasi] = relationship(back_populates="jadwal", uselist=False)
