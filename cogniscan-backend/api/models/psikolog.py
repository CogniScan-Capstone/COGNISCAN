"""
Model Psikolog — extends Pengguna (one-to-one).

Menyimpan data profesional psikolog termasuk nomor STR/SIPP.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class Psikolog(Base):
    """Profil psikolog — data profesional dan relasi ke pasien-pasiennya."""

    __tablename__ = "psikolog"

    id_psikolog: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_pengguna: Mapped[int] = mapped_column(
        ForeignKey("pengguna.id_pengguna", ondelete="CASCADE"), unique=True, nullable=False
    )
    nomor_str: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="Surat Tanda Registrasi"
    )
    nomor_sipp: Mapped[str | None] = mapped_column(
        String(50), nullable=True, comment="Surat Izin Praktik Psikologi"
    )
    spesialisasi: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status_verifikasi: Mapped[str] = mapped_column(
        String(20), default="menunggu",
        comment="'menunggu', 'disetujui', 'ditolak'"
    )
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ──────────────────────────────────────
    pengguna: Mapped["Pengguna"] = relationship(back_populates="psikolog")
    pasien_list: Mapped[list["Pasien"]] = relationship(back_populates="psikolog")
    pra_asesmen: Mapped[list["PraAsesmen"]] = relationship(back_populates="psikolog")
    jadwal: Mapped[list["JadwalPsikolog"]] = relationship(back_populates="psikolog")
    hasil_konsultasi: Mapped[list["HasilKonsultasi"]] = relationship(back_populates="psikolog")
