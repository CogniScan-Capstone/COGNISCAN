"""
Model PemesananKonsultasi — booking pasien ke slot jadwal psikolog.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class PemesananKonsultasi(Base):
    __tablename__ = "pemesanan_konsultasi"

    id_pemesanan: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_pasien: Mapped[int] = mapped_column(
        ForeignKey("pasien.id_pasien", ondelete="CASCADE"), nullable=False
    )
    id_jadwal: Mapped[int] = mapped_column(
        ForeignKey("jadwal_psikolog.id_jadwal", ondelete="CASCADE"), unique=True, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(30), default="menunggu_pembayaran",
        comment="'menunggu_pembayaran', 'terkonfirmasi', 'berlangsung', 'selesai', 'dibatalkan'"
    )
    catatan_pasien: Mapped[str | None] = mapped_column(Text, nullable=True)
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    pasien: Mapped["Pasien"] = relationship(back_populates="pemesanan_konsultasi")
    jadwal: Mapped["JadwalPsikolog"] = relationship(back_populates="pemesanan")
    hasil_konsultasi: Mapped["HasilKonsultasi"] = relationship(back_populates="pemesanan", uselist=False)
    transaksi_pembayaran: Mapped["TransaksiPembayaran"] = relationship(back_populates="pemesanan", uselist=False)
