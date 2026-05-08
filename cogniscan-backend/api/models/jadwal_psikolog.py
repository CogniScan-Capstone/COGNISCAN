"""
Model JadwalPsikolog — slot konsultasi yang dibuat oleh psikolog.
"""

from datetime import date, time, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Time, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class JadwalPsikolog(Base):
    __tablename__ = "jadwal_psikolog"

    id_jadwal: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_psikolog: Mapped[int] = mapped_column(
        ForeignKey("psikolog.id_psikolog", ondelete="CASCADE"), nullable=False
    )
    tanggal: Mapped[date] = mapped_column(Date, nullable=False)
    jam_mulai: Mapped[time] = mapped_column(Time, nullable=False)
    jam_selesai: Mapped[time] = mapped_column(Time, nullable=False)
    is_tersedia: Mapped[bool] = mapped_column(Boolean, default=True)
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    psikolog: Mapped["Psikolog"] = relationship(back_populates="jadwal")
    pemesanan: Mapped["PemesananKonsultasi"] = relationship(back_populates="jadwal", uselist=False)
