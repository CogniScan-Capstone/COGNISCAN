from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, Field


class ConsultationResultCreate(BaseModel):
    pasien_hadir: bool = True
    ringkasan_untuk_pasien: str | None = Field(default=None, max_length=4000)
    catatan_internal: str | None = Field(default=None, max_length=4000)
    rekomendasi_tindak_lanjut: str | None = Field(default=None, max_length=4000)
    perlu_sesi_lanjutan: bool = False
    keluhan_utama: str | None = Field(default=None, max_length=4000)
    observasi_psikolog: str | None = Field(default=None, max_length=4000)
    asesmen_klinis: str | None = Field(default=None, max_length=4000)
    intervensi_diberikan: str | None = Field(default=None, max_length=4000)
    rencana_tindak_lanjut: str | None = Field(default=None, max_length=4000)
    tingkat_risiko: str | None = Field(default=None, max_length=100)


class ConsultationResultResponse(BaseModel):
    id_hasil_konsultasi: int
    id_pemesanan_konsultasi: int | None = None
    pasien_hadir: bool | None = None
    ringkasan_untuk_pasien: str | None = None
    catatan_internal: str | None = None
    rekomendasi_tindak_lanjut: str | None = None
    perlu_sesi_lanjutan: bool | None = None
    keluhan_utama: str | None = None
    observasi_psikolog: str | None = None
    asesmen_klinis: str | None = None
    intervensi_diberikan: str | None = None
    rencana_tindak_lanjut: str | None = None
    tingkat_risiko: str | None = None
    versi_format_rekam_medis: str | None = None
    status_konsultasi: str | None = None
    dibuat_pada: datetime | None = None
    diperbarui_pada: datetime | None = None


class ConsultationHistoryItem(BaseModel):
    id_pemesanan_konsultasi: int
    id_booking_sebelumnya: int | None = None
    tanggal_konsultasi: date | None = None
    waktu_mulai: str | None = None
    waktu_selesai: str | None = None
    mode_konsultasi: str | None = None
    status_konsultasi: str | None = None
    status_pembayaran: str | None = None
    konteks_pemicu: str | None = None
    indikator_urgensi: str | None = None
    pasien_hadir: bool | None = None
    ringkasan_untuk_pasien: str | None = None
    rekomendasi_tindak_lanjut: str | None = None
    catatan_internal: str | None = None
    keluhan_utama: str | None = None
    observasi_psikolog: str | None = None
    asesmen_klinis: str | None = None
    intervensi_diberikan: str | None = None
    rencana_tindak_lanjut: str | None = None
    tingkat_risiko: str | None = None
    perlu_sesi_lanjutan: bool | None = None
    hasil_dibuat_pada: datetime | None = None
    hasil_diperbarui_pada: datetime | None = None


class PatientConsultationHistoryResponse(BaseModel):
    id_pasien: int
    nama_pasien: str | None = None
    email_pasien: str | None = None
    total_konsultasi: int
    items: list[ConsultationHistoryItem]
