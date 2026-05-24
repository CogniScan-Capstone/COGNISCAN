"""
Model PermintaanRescheduleKonsultasi - approval flow reschedule konsultasi.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.pasien import Pasien
    from api.models.pemesanan_konsultasi import PemesananKonsultasi
    from api.models.psikolog import Psikolog


class PermintaanRescheduleKonsultasi(Base):
    __tablename__ = "permintaan_reschedule_konsultasi"

    id_permintaan_reschedule: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    id_pemesanan_konsultasi: Mapped[int] = mapped_column(
        ForeignKey("pemesanan_konsultasi.id_pemesanan_konsultasi"),
        nullable=False,
    )
    id_pasien: Mapped[int | None] = mapped_column(
        ForeignKey("pasien.id_pasien"),
        nullable=True,
    )
    id_psikolog: Mapped[int | None] = mapped_column(
        ForeignKey("psikolog.id_psikolog"),
        nullable=True,
    )
    alasan_pasien: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, default="pending", nullable=False)
    catatan_psikolog: Mapped[str | None] = mapped_column(Text, nullable=True)
    diminta_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    direspons_pada: Mapped[str | None] = mapped_column(DateTime(timezone=True), nullable=True)

    pemesanan: Mapped["PemesananKonsultasi"] = relationship(
        back_populates="permintaan_reschedule",
    )
    pasien: Mapped["Pasien"] = relationship()
    psikolog: Mapped["Psikolog"] = relationship()
