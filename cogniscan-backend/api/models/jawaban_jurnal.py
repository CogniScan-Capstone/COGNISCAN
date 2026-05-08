"""
Model JawabanJurnal — child of SesiJurnal, satu row per pertanyaan.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.sesi_jurnal import SesiJurnal


class JawabanJurnal(Base):
    __tablename__ = "jawaban_jurnal"

    id_jawaban_jurnal: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_sesi_jurnal: Mapped[int | None] = mapped_column(
        ForeignKey("sesi_jurnal.id_sesi_jurnal"), nullable=True
    )
    urutan_pertanyaan: Mapped[int | None] = mapped_column(Integer, nullable=True)
    teks_pertanyaan: Mapped[str | None] = mapped_column(Text, nullable=True)
    teks_jawaban: Mapped[str | None] = mapped_column(Text, nullable=True)
    dijawab_pada: Mapped[str | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    sesi_jurnal: Mapped[SesiJurnal] = relationship(back_populates="jawaban")
