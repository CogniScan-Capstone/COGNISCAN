"""
Model SesiJurnal — wadah multi-question guided journaling.

Setiap sesi berisi 3-5 pertanyaan terbuka yang dijawab pasien secara berurutan.
Sesi selesai saat semua pertanyaan dijawab dan di-finalize.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class SesiJurnal(Base):
    """Satu sesi guided journaling — berisi beberapa jawaban jurnal."""

    __tablename__ = "sesi_jurnal"

    id_sesi: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_pasien: Mapped[int] = mapped_column(
        ForeignKey("pasien.id_pasien", ondelete="CASCADE"), nullable=False
    )
    konteks_pemicu: Mapped[str | None] = mapped_column(
        String(255), nullable=True,
        comment="Konteks: 'akademik', 'hubungan', 'keluarga', 'pekerjaan', 'lainnya'"
    )
    jumlah_pertanyaan: Mapped[int] = mapped_column(Integer, default=5)
    status: Mapped[str] = mapped_column(
        String(20), default="berlangsung",
        comment="'berlangsung', 'selesai', 'dibatalkan'"
    )
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    selesai_pada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ──────────────────────────────────────
    pasien: Mapped["Pasien"] = relationship(back_populates="sesi_jurnal")
    jawaban: Mapped[list["JawabanJurnal"]] = relationship(
        back_populates="sesi_jurnal", order_by="JawabanJurnal.urutan"
    )
    pra_asesmen: Mapped["PraAsesmen"] = relationship(back_populates="sesi_jurnal", uselist=False)
