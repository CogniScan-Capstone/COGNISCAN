"""
Model PraAsesmen — hasil analisis AI dari sesi journaling.

Ini adalah tabel inti CogniScan yang menyimpan:
- Hasil deteksi distorsi kognitif oleh AI
- Status validasi oleh psikolog
- Feedback terstruktur dari psikolog (Decision 5)
- Indikator crisis (Decision 4)
- SLA tracking (Decision 3)
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class PraAsesmen(Base):
    """Pre-assessment — hasil analisis AI + validasi psikolog."""

    __tablename__ = "pra_asesmen"

    id_pra_asesmen: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_pasien: Mapped[int] = mapped_column(
        ForeignKey("pasien.id_pasien", ondelete="CASCADE"), nullable=False
    )
    id_sesi: Mapped[int] = mapped_column(
        ForeignKey("sesi_jurnal.id_sesi", ondelete="CASCADE"), unique=True, nullable=False
    )
    id_psikolog: Mapped[int | None] = mapped_column(
        ForeignKey("psikolog.id_psikolog", ondelete="SET NULL"), nullable=True,
        comment="Psikolog yang mereview (auto-assign dari pasien.id_psikolog)"
    )

    # ── Hasil AI ───────────────────────────────────────────
    ringkasan_ai: Mapped[str | None] = mapped_column(Text, nullable=True)
    skor_severity: Mapped[float | None] = mapped_column(Float, nullable=True, comment="Skor 0-10")
    level_severity: Mapped[str | None] = mapped_column(
        String(20), nullable=True,
        comment="'hijau', 'kuning', 'oranye', 'merah'"
    )

    # ── Status Validasi ────────────────────────────────────
    status_validasi: Mapped[str] = mapped_column(
        String(30), default="menunggu_review",
        comment="'menunggu_review', 'sedang_direview', 'selesai', 'perlu_eskalasi', 'crisis_terdeteksi', 'crisis_handled'"
    )

    # ── Crisis Indicators (Decision 4) ─────────────────────
    ada_indikasi_self_harm: Mapped[bool] = mapped_column(Boolean, default=False)
    ada_indikasi_bunuh_diri: Mapped[bool] = mapped_column(Boolean, default=False)
    level_keputusasaan: Mapped[str | None] = mapped_column(
        String(20), nullable=True,
        comment="'tidak_ada', 'ringan', 'sedang', 'berat'"
    )
    apakah_crisis: Mapped[bool] = mapped_column(Boolean, default=False)

    # ── SLA Tracking (Decision 3) ──────────────────────────
    batas_review_pada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="Deadline SLA review"
    )
    dijemput_pada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, comment="Waktu psikolog mulai review"
    )

    # ── Feedback Psikolog Terstruktur (Decision 5) ─────────
    akurasi_ai: Mapped[str | None] = mapped_column(
        String(30), nullable=True,
        comment="'akurat', 'sebagian_akurat', 'tidak_akurat'"
    )
    catatan_untuk_pasien: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Pesan empatik untuk pasien (visible ke pasien)"
    )
    severity_dikonfirmasi: Mapped[str | None] = mapped_column(
        String(20), nullable=True,
        comment="Severity final: 'hijau', 'kuning', 'oranye', 'merah'"
    )
    rekomendasi: Mapped[str | None] = mapped_column(
        String(30), nullable=True,
        comment="'self_help', 'lanjut_konsultasi', 'rujukan', 'pantau_ulang'"
    )
    catatan_internal: Mapped[str | None] = mapped_column(
        Text, nullable=True, comment="Catatan medis internal (tidak terlihat pasien)"
    )

    # ── Timestamps ─────────────────────────────────────────
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    selesai_pada: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Relationships ──────────────────────────────────────
    pasien: Mapped["Pasien"] = relationship(back_populates="pra_asesmen")
    sesi_jurnal: Mapped["SesiJurnal"] = relationship(back_populates="pra_asesmen")
    psikolog: Mapped["Psikolog"] = relationship(back_populates="pra_asesmen")
    distorsi_terdeteksi: Mapped[list["DistorsiTerdeteksi"]] = relationship(
        back_populates="pra_asesmen", cascade="all, delete-orphan"
    )
