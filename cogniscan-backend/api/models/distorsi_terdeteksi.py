"""
Model DistorsiTerdeteksi — child of PraAsesmen, satu row per distorsi.

Menyimpan setiap distorsi kognitif yang terdeteksi oleh AI
beserta evidence (kutipan teks) dan confidence score.
"""

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class DistorsiTerdeteksi(Base):
    """Satu distorsi kognitif yang terdeteksi dalam pre-assessment."""

    __tablename__ = "distorsi_terdeteksi"

    id_distorsi: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_pra_asesmen: Mapped[int] = mapped_column(
        ForeignKey("pra_asesmen.id_pra_asesmen", ondelete="CASCADE"), nullable=False
    )
    nama_distorsi: Mapped[str] = mapped_column(
        String(100), nullable=False,
        comment="Nama distorsi kognitif, misal 'Overgeneralization'"
    )
    confidence: Mapped[float | None] = mapped_column(
        Float, nullable=True, comment="Confidence score AI (0.0 - 1.0)"
    )
    evidence: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Kutipan teks pasien yang jadi bukti"
    )
    penjelasan: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Penjelasan AI mengapa ini termasuk distorsi"
    )
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ──────────────────────────────────────
    pra_asesmen: Mapped["PraAsesmen"] = relationship(back_populates="distorsi_terdeteksi")
