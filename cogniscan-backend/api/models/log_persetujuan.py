"""
Model LogPersetujuan — compliance UU PDP (Perlindungan Data Pribadi).

Mencatat setiap kali pengguna memberikan atau mencabut consent
atas pemrosesan data pribadi mereka.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class LogPersetujuan(Base):
    """Log consent UU PDP — setiap record = satu aksi consent."""

    __tablename__ = "log_persetujuan"

    id_log: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_pengguna: Mapped[int] = mapped_column(
        ForeignKey("pengguna.id_pengguna", ondelete="CASCADE"), nullable=False
    )
    jenis_persetujuan: Mapped[str] = mapped_column(
        String(50), nullable=False,
        comment="'data_pribadi', 'analisis_ai', 'penyimpanan_jurnal'"
    )
    diberikan: Mapped[bool] = mapped_column(Boolean, default=True)
    versi_kebijakan: Mapped[str] = mapped_column(String(20), default="1.0")
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    catatan: Mapped[str | None] = mapped_column(Text, nullable=True)
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ──────────────────────────────────────
    pengguna: Mapped["Pengguna"] = relationship(back_populates="log_persetujuan")
