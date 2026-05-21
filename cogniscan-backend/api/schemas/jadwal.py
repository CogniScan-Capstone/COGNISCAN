from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class PsikologScheduleBookingResponse(BaseModel):
    id_pemesanan_konsultasi: int
    id_pasien: int | None = None
    nama_pasien: str | None = None
    email_pasien: str | None = None
    tanggal_konsultasi: date | None = None
    waktu_mulai: str | None = None
    waktu_selesai: str | None = None
    mode_konsultasi: str | None = None
    status_konsultasi: str | None = None
    status_pembayaran: str | None = None
    total_biaya: Decimal | None = None
    link_pertemuan: str | None = None
    platform_pertemuan: str | None = None
    lokasi_konsultasi: str | None = None
    konteks_pemicu: str | None = None
    indikator_urgensi: str | None = None
