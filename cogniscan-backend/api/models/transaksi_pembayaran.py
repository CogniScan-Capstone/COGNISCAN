"""
Model TransaksiPembayaran — bukti pembayaran konsultasi.
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class TransaksiPembayaran(Base):
    __tablename__ = "transaksi_pembayaran"

    id_transaksi: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_pemesanan: Mapped[int] = mapped_column(
        ForeignKey("pemesanan_konsultasi.id_pemesanan", ondelete="CASCADE"), unique=True, nullable=False
    )
    jumlah: Mapped[float] = mapped_column(Float, nullable=False)
    metode_pembayaran: Mapped[str | None] = mapped_column(String(50), nullable=True)
    bukti_pembayaran_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="menunggu",
        comment="'menunggu', 'diverifikasi', 'ditolak'"
    )
    catatan_admin: Mapped[str | None] = mapped_column(Text, nullable=True)
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    diverifikasi_pada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    pemesanan: Mapped["PemesananKonsultasi"] = relationship(back_populates="transaksi_pembayaran")
