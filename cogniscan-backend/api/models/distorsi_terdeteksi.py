"""
Model DistorsiTerdeteksi — child of PraAsesmen.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base

if TYPE_CHECKING:
    from api.models.pra_asesmen import PraAsesmen


class DistorsiTerdeteksi(Base):
    __tablename__ = "distorsi_terdeteksi"

    id_distorsi_terdeteksi: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    id_pra_asesmen: Mapped[int | None] = mapped_column(
        ForeignKey("pra_asesmen.id_pra_asesmen"), nullable=True
    )
    tipe_distorsi: Mapped[str | None] = mapped_column(Text, nullable=True)
    penjelasan: Mapped[str | None] = mapped_column(Text, nullable=True)
    kalimat_bukti: Mapped[str | None] = mapped_column(Text, nullable=True)
    skor_keyakinan_ai: Mapped[float | None] = mapped_column(Numeric, nullable=True)

    # Relationships
    pra_asesmen: Mapped[PraAsesmen] = relationship(back_populates="distorsi_terdeteksi")
