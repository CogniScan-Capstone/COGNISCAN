"""
Model PraAsesmen — hasil analisis AI dari sesi journaling.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.distorsi_terdeteksi import DistorsiTerdeteksi
    from api.models.pemesanan_konsultasi import PemesananKonsultasi
    from api.models.psikolog import Psikolog
    from api.models.sesi_jurnal import SesiJurnal


class PraAsesmen(Base):
    __tablename__ = "pra_asesmen"

    id_pra_asesmen: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_sesi_jurnal: Mapped[int | None] = mapped_column(
        ForeignKey("sesi_jurnal.id_sesi_jurnal"), nullable=True
    )
    id_psikolog: Mapped[int | None] = mapped_column(
        ForeignKey("psikolog.id_psikolog"), nullable=True
    )
    indikator_urgensi: Mapped[str | None] = mapped_column(Text, nullable=True)
    skor_keparahan: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ringkasan_kondisi: Mapped[str | None] = mapped_column(Text, nullable=True)
    rekomendasi: Mapped[str | None] = mapped_column(Text, nullable=True)
    feedback_psikolog: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_validasi: Mapped[str | None] = mapped_column(
        Text, default="menunggu",
        comment="'menunggu', 'sedang_direview', 'selesai', 'perlu_eskalasi'"
    )
    divalidasi_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    dibuat_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    sesi_jurnal: Mapped[SesiJurnal] = relationship(back_populates="pra_asesmen")
    psikolog: Mapped[Psikolog] = relationship(back_populates="pra_asesmen")
    distorsi_terdeteksi: Mapped[list[DistorsiTerdeteksi]] = relationship(back_populates="pra_asesmen")
    pemesanan_konsultasi: Mapped[list[PemesananKonsultasi]] = relationship(back_populates="pra_asesmen")

    @property
    def nama_psikolog(self) -> str | None:
        return self.psikolog.nama_lengkap if self.psikolog else None

    @property
    def konteks_pemicu(self) -> str | None:
        return self.sesi_jurnal.konteks_pemicu if self.sesi_jurnal else None
