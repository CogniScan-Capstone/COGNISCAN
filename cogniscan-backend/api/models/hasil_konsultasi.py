"""
Model HasilKonsultasi — output sesi konsultasi yang diisi psikolog.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class HasilKonsultasi(Base):
    __tablename__ = "hasil_konsultasi"

    id_hasil: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_pemesanan: Mapped[int] = mapped_column(
        ForeignKey("pemesanan_konsultasi.id_pemesanan", ondelete="CASCADE"), unique=True, nullable=False
    )
    id_psikolog: Mapped[int] = mapped_column(
        ForeignKey("psikolog.id_psikolog", ondelete="CASCADE"), nullable=False
    )
    catatan_sesi: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosa_awal: Mapped[str | None] = mapped_column(Text, nullable=True)
    rekomendasi_tindak_lanjut: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), default="draft", comment="'draft', 'final'"
    )
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    pemesanan: Mapped["PemesananKonsultasi"] = relationship(back_populates="hasil_konsultasi")
    psikolog: Mapped["Psikolog"] = relationship(back_populates="hasil_konsultasi")
