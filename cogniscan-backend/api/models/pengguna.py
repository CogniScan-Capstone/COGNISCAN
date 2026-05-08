"""
Model Pengguna — tabel dasar autentikasi untuk semua role.

Setiap user di CogniScan (pasien, psikolog, admin) punya satu record di tabel ini.
Role menentukan akses dan fitur yang tersedia.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.core.database import Base


class Pengguna(Base):
    """Tabel utama autentikasi — parent dari pasien, psikolog, admin."""

    __tablename__ = "pengguna"

    id_pengguna: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    nama_lengkap: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="Role: 'pasien', 'psikolog', 'admin'",
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    dibuat_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    diperbarui_pada: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # ── Relationships ──────────────────────────────────────
    pasien: Mapped["Pasien"] = relationship(back_populates="pengguna", uselist=False)
    psikolog: Mapped["Psikolog"] = relationship(back_populates="pengguna", uselist=False)
    admin: Mapped["Admin"] = relationship(back_populates="pengguna", uselist=False)
    log_persetujuan: Mapped[list["LogPersetujuan"]] = relationship(back_populates="pengguna")
