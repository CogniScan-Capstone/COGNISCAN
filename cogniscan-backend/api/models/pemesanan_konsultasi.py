"""
Model PemesananKonsultasi — booking pasien ke slot jadwal psikolog.
Sesuai schema Supabase.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.hasil_konsultasi import HasilKonsultasi
    from api.models.jadwal_psikolog import JadwalPsikolog
    from api.models.pasien import Pasien
    from api.models.pra_asesmen import PraAsesmen
    from api.models.psikolog import Psikolog
    from api.models.transaksi_pembayaran import TransaksiPembayaran


class PemesananKonsultasi(Base):
    __tablename__ = "pemesanan_konsultasi"

    id_pemesanan_konsultasi: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pasien: Mapped[int | None] = mapped_column(ForeignKey("pasien.id_pasien"), nullable=True)
    id_psikolog: Mapped[int | None] = mapped_column(ForeignKey("psikolog.id_psikolog"), nullable=True)
    id_jadwal_psikolog: Mapped[int | None] = mapped_column(ForeignKey("jadwal_psikolog.id_jadwal_psikolog"), nullable=True)
    id_pra_asesmen: Mapped[int | None] = mapped_column(ForeignKey("pra_asesmen.id_pra_asesmen"), nullable=True)
    status_konsultasi: Mapped[str | None] = mapped_column(Text, default="menunggu")
    mode_konsultasi: Mapped[str | None] = mapped_column(Text, nullable=True)
    link_pertemuan: Mapped[str | None] = mapped_column(Text, nullable=True)
    platform_pertemuan: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_biaya: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    status_pembayaran: Mapped[str | None] = mapped_column(Text, default="belum_bayar")
    tanggal_booking: Mapped[str | None] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    pasien: Mapped["Pasien"] = relationship(back_populates="pemesanan_konsultasi")
    psikolog: Mapped["Psikolog"] = relationship(back_populates="pemesanan_konsultasi")
    jadwal: Mapped["JadwalPsikolog"] = relationship(back_populates="pemesanan")
    pra_asesmen: Mapped["PraAsesmen"] = relationship(back_populates="pemesanan_konsultasi")
    hasil_konsultasi: Mapped["HasilKonsultasi"] = relationship(back_populates="pemesanan", uselist=False)
    transaksi_pembayaran: Mapped["TransaksiPembayaran"] = relationship(back_populates="pemesanan", uselist=False)
