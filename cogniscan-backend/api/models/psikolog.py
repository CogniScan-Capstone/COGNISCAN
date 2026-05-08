"""
Model Psikolog — extends Pengguna (FK UUID).
Data profesional lengkap termasuk STR, SIP, dan dokumen upload.
"""

from __future__ import annotations

import uuid as uuid_module
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.admin import Admin
    from api.models.jadwal_psikolog import JadwalPsikolog
    from api.models.pemesanan_konsultasi import PemesananKonsultasi
    from api.models.pengguna import Pengguna
    from api.models.pra_asesmen import PraAsesmen


class Psikolog(Base):
    __tablename__ = "psikolog"

    id_psikolog: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pengguna: Mapped[uuid_module.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pengguna.id"), nullable=True
    )
    id_admin: Mapped[int | None] = mapped_column(
        ForeignKey("admin.id_admin"), nullable=True,
        comment="Admin yang mendaftarkan psikolog ini"
    )
    nama_lengkap: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str | None] = mapped_column(Text, nullable=True)
    nomor_hp: Mapped[str | None] = mapped_column(Text, nullable=True)
    spesialisasi: Mapped[str | None] = mapped_column(Text, nullable=True)
    pengalaman_tahun: Mapped[int | None] = mapped_column(Integer, nullable=True)
    universitas_asal: Mapped[str | None] = mapped_column(Text, nullable=True)
    tahun_lulus: Mapped[int | None] = mapped_column(Integer, nullable=True)
    no_str: Mapped[str | None] = mapped_column(Text, nullable=True)
    no_sip: Mapped[str | None] = mapped_column(Text, nullable=True)
    tgl_kadaluarsa_sip: Mapped[str | None] = mapped_column(Date, nullable=True)
    tgl_kadaluarsa_str: Mapped[str | None] = mapped_column(Date, nullable=True)
    upload_dokumen_str: Mapped[str | None] = mapped_column(Text, nullable=True)
    upload_dokumen_sip: Mapped[str | None] = mapped_column(Text, nullable=True)
    bio_singkat: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_akun: Mapped[str | None] = mapped_column(Text, default="pending")
    apakah_sudah_ganti_password: Mapped[bool | None] = mapped_column(Boolean, default=False)
    dibuat_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    pengguna: Mapped[Pengguna] = relationship(back_populates="psikolog")
    admin: Mapped[Admin] = relationship(back_populates="psikolog_terdaftar")
    pra_asesmen: Mapped[list[PraAsesmen]] = relationship(back_populates="psikolog")
    jadwal: Mapped[list[JadwalPsikolog]] = relationship(back_populates="psikolog")
    pemesanan_konsultasi: Mapped[list[PemesananKonsultasi]] = relationship(back_populates="psikolog")
