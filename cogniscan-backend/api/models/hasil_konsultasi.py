"""
Model HasilKonsultasi — output sesi konsultasi.
Sesuai schema Supabase.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.pemesanan_konsultasi import PemesananKonsultasi


class HasilKonsultasi(Base):
    __tablename__ = "hasil_konsultasi"

    id_hasil_konsultasi: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pemesanan_konsultasi: Mapped[int | None] = mapped_column(
        ForeignKey("pemesanan_konsultasi.id_pemesanan_konsultasi"), nullable=True
    )
    pasien_hadir: Mapped[bool | None] = mapped_column(Boolean, default=True)
    ringkasan_untuk_pasien: Mapped[str | None] = mapped_column(Text, nullable=True)
    catatan_evaluasi: Mapped[str | None] = mapped_column(Text, nullable=True)
    catatan_internal: Mapped[str | None] = mapped_column(Text, nullable=True)
    rekomendasi_tindak_lanjut: Mapped[str | None] = mapped_column(Text, nullable=True)
    perlu_sesi_lanjutan: Mapped[bool | None] = mapped_column(Boolean, default=False)
    keluhan_utama: Mapped[str | None] = mapped_column(Text, nullable=True)
    observasi_psikolog: Mapped[str | None] = mapped_column(Text, nullable=True)
    asesmen_klinis: Mapped[str | None] = mapped_column(Text, nullable=True)
    intervensi_diberikan: Mapped[str | None] = mapped_column(Text, nullable=True)
    rencana_tindak_lanjut: Mapped[str | None] = mapped_column(Text, nullable=True)
    tingkat_risiko: Mapped[str | None] = mapped_column(Text, nullable=True)
    versi_format_rekam_medis: Mapped[str | None] = mapped_column(
        Text, default="rekam_medis_v1", nullable=True
    )
    dibuat_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    diperbarui_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )

    # Relationships
    pemesanan: Mapped[PemesananKonsultasi] = relationship(back_populates="hasil_konsultasi")
