"""
Model SesiJurnal — wadah multi-question guided journaling.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.jawaban_jurnal import JawabanJurnal
    from api.models.pasien import Pasien
    from api.models.pra_asesmen import PraAsesmen


class SesiJurnal(Base):
    __tablename__ = "sesi_jurnal"

    id_sesi_jurnal: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pasien: Mapped[int | None] = mapped_column(
        ForeignKey("pasien.id_pasien"), nullable=True
    )
    konteks_pemicu: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_pertanyaan: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[str | None] = mapped_column(
        Text, default="sedang_berjalan",
        comment="'sedang_berjalan', 'selesai', 'dibatalkan'"
    )
    dimulai_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    diselesaikan_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    pasien: Mapped[Pasien] = relationship(back_populates="sesi_jurnal")
    jawaban: Mapped[list[JawabanJurnal]] = relationship(
        back_populates="sesi_jurnal", order_by="JawabanJurnal.urutan_pertanyaan"
    )
    pra_asesmen: Mapped[PraAsesmen] = relationship(back_populates="sesi_jurnal", uselist=False)
