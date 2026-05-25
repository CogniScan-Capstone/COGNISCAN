from __future__ import annotations

from datetime import date, time
from decimal import Decimal

from pydantic import BaseModel, Field

from api.schemas.booking import BookingRescheduleRequestResponse


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
    hasil_konsultasi_ringkasan: str | None = None
    hasil_konsultasi_rekomendasi: str | None = None
    hasil_konsultasi_pasien_hadir: bool | None = None
    perlu_sesi_lanjutan: bool | None = None
    reschedule_request: BookingRescheduleRequestResponse | None = None


class PsikologAvailabilitySlotInput(BaseModel):
    waktu_mulai: time
    waktu_selesai: time | None = None


class PsikologAvailabilityCreate(BaseModel):
    tanggal_praktik: date
    waktu_mulai: time
    waktu_selesai: time | None = None


class PsikologAvailabilityBulkCreate(BaseModel):
    start_date: date
    end_date: date
    weekdays: list[int] = Field(..., min_length=1)
    slots: list[PsikologAvailabilitySlotInput] = Field(..., min_length=1)


class PsikologAvailabilityUpdate(BaseModel):
    tanggal_praktik: date | None = None
    waktu_mulai: time | None = None
    waktu_selesai: time | None = None
    apakah_tersedia: bool | None = None


class PsikologAvailabilityResponse(BaseModel):
    id_jadwal_psikolog: int
    id_psikolog: int | None = None
    tanggal_praktik: date | None = None
    waktu_mulai: str | None = None
    waktu_selesai: str | None = None
    apakah_tersedia: bool | None = None
    status_slot: str
    id_pemesanan_konsultasi: int | None = None
    nama_pasien: str | None = None
    mode_konsultasi: str | None = None
    status_konsultasi: str | None = None
    status_pembayaran: str | None = None


class PsikologAvailabilityBulkCreateResponse(BaseModel):
    created_count: int
    skipped_count: int
    slots: list[PsikologAvailabilityResponse]


class PsikologAvailabilityDeleteResponse(BaseModel):
    message: str
