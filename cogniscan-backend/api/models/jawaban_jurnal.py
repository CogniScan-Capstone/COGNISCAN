"""
Model JawabanJurnal — child of SesiJurnal, satu row per pertanyaan.

Menyimpan pertanyaan yang diberikan sistem dan jawaban dari pasien.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class JawabanJurnal(Base):
    """Satu pasang pertanyaan-jawaban dalam sesi journaling."""

    __tablename__ = "jawaban_jurnal"

    id_jawaban: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_sesi: Mapped[int] = mapped_column(
        ForeignKey("sesi_jurnal.id_sesi", ondelete="CASCADE"), nullable=False
    )
    urutan: Mapped[int] = mapped_column(Integer, nullable=False, comment="Urutan pertanyaan (1-5)")
    pertanyaan: Mapped[str] = mapped_column(Text, nullable=False)
    jawaban: Mapped[str | None] = mapped_column(Text, nullable=True)
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    dijawab_pada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ──────────────────────────────────────
    sesi_jurnal: Mapped["SesiJurnal"] = relationship(back_populates="jawaban")
