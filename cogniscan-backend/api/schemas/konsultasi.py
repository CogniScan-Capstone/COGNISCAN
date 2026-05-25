from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ConsultationResultCreate(BaseModel):
    pasien_hadir: bool = True
    ringkasan_untuk_pasien: str | None = Field(default=None, max_length=4000)
    catatan_internal: str | None = Field(default=None, max_length=4000)
    rekomendasi_tindak_lanjut: str | None = Field(default=None, max_length=4000)
    perlu_sesi_lanjutan: bool = False


class ConsultationResultResponse(BaseModel):
    id_hasil_konsultasi: int
    id_pemesanan_konsultasi: int | None = None
    pasien_hadir: bool | None = None
    ringkasan_untuk_pasien: str | None = None
    catatan_internal: str | None = None
    rekomendasi_tindak_lanjut: str | None = None
    perlu_sesi_lanjutan: bool | None = None
    status_konsultasi: str | None = None
    dibuat_pada: datetime | None = None
    diperbarui_pada: datetime | None = None
