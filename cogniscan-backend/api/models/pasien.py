"""
Model Pasien — extends Pengguna (FK UUID).
"""

from __future__ import annotations

import uuid as uuid_module
from typing import TYPE_CHECKING

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.pemesanan_konsultasi import PemesananKonsultasi
    from api.models.pengguna import Pengguna
    from api.models.sesi_jurnal import SesiJurnal


class Pasien(Base):
    __tablename__ = "pasien"

    id_pasien: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pengguna: Mapped[uuid_module.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pengguna.id"), nullable=True
    )
    nama_lengkap: Mapped[str] = mapped_column(Text, nullable=False)
    jenis_kelamin: Mapped[str | None] = mapped_column(Text, nullable=True)
    tanggal_lahir: Mapped[str | None] = mapped_column(Date, nullable=True)
    alamat_lengkap: Mapped[str | None] = mapped_column(Text, nullable=True)
    no_hp_wa: Mapped[str | None] = mapped_column(Text, nullable=True)
    dibuat_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    pengguna: Mapped[Pengguna] = relationship(back_populates="pasien")
    sesi_jurnal: Mapped[list[SesiJurnal]] = relationship(back_populates="pasien")
    pemesanan_konsultasi: Mapped[list[PemesananKonsultasi]] = relationship(back_populates="pasien")
