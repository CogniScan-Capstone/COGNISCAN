"""
Model Pasien — extends Pengguna (one-to-one).

Menyimpan data profil pasien dan relasi ke psikolog tetap (fixed assignment).
"""

from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class Pasien(Base):
    """Profil pasien — terhubung ke pengguna dan psikolog tetap."""

    __tablename__ = "pasien"

    id_pasien: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    id_pengguna: Mapped[int] = mapped_column(
        ForeignKey("pengguna.id_pengguna", ondelete="CASCADE"), unique=True, nullable=False
    )
    tanggal_lahir: Mapped[date | None] = mapped_column(Date, nullable=True)
    jenis_kelamin: Mapped[str | None] = mapped_column(
        String(20), nullable=True, comment="'laki-laki', 'perempuan', 'lainnya'"
    )
    no_telepon: Mapped[str | None] = mapped_column(String(20), nullable=True)
    alamat: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Psikolog tetap (fixed assignment) — NULL jika belum pilih
    id_psikolog: Mapped[int | None] = mapped_column(
        ForeignKey("psikolog.id_psikolog", ondelete="SET NULL"), nullable=True
    )

    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # ── Relationships ──────────────────────────────────────
    pengguna: Mapped["Pengguna"] = relationship(back_populates="pasien")
    psikolog: Mapped["Psikolog"] = relationship(back_populates="pasien_list")
    sesi_jurnal: Mapped[list["SesiJurnal"]] = relationship(back_populates="pasien")
    pra_asesmen: Mapped[list["PraAsesmen"]] = relationship(back_populates="pasien")
    pemesanan_konsultasi: Mapped[list["PemesananKonsultasi"]] = relationship(back_populates="pasien")
