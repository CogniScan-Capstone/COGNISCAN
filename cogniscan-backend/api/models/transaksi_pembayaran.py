"""
Model TransaksiPembayaran — bukti pembayaran konsultasi.
Sesuai schema Supabase.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.pemesanan_konsultasi import PemesananKonsultasi


class TransaksiPembayaran(Base):
    __tablename__ = "transaksi_pembayaran"

    id_transaksi_pembayaran: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pemesanan_konsultasi: Mapped[int | None] = mapped_column(
        ForeignKey("pemesanan_konsultasi.id_pemesanan_konsultasi"), nullable=True
    )
    nomor_nota: Mapped[str | None] = mapped_column(Text, nullable=True)
    metode_pembayaran: Mapped[str | None] = mapped_column(Text, nullable=True)
    jumlah_bayar: Mapped[float | None] = mapped_column(Numeric, nullable=True)
    bukti_bayar: Mapped[str | None] = mapped_column(Text, nullable=True)
    waktu_bayar: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    batas_waktu_bayar: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status_transaksi: Mapped[str | None] = mapped_column(Text, default="proses")

    # Relationships
    pemesanan: Mapped[PemesananKonsultasi] = relationship(back_populates="transaksi_pembayaran")
