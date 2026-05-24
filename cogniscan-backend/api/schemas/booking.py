from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ConsultationMode = Literal["online", "offline"]


class BookingCheckoutRequest(BaseModel):
    tanggal_konsultasi: date
    waktu_konsultasi: time
    mode_konsultasi: ConsultationMode
    id_pra_asesmen: int | None = Field(default=None, gt=0)


class BookingRescheduleRequest(BaseModel):
    tanggal_konsultasi: date
    waktu_konsultasi: time
    mode_konsultasi: ConsultationMode


class BookingCancelRequest(BaseModel):
    alasan_pasien: str | None = Field(default=None, max_length=1000)
    konfirmasi_no_refund: bool = False


class BookingRescheduleRequestCreate(BaseModel):
    alasan_pasien: str = Field(..., min_length=10, max_length=1000)


class BookingRescheduleDecisionRequest(BaseModel):
    catatan_psikolog: str | None = Field(default=None, max_length=1000)


class BookingRescheduleRejectRequest(BaseModel):
    catatan_psikolog: str = Field(..., min_length=5, max_length=1000)


class BookingRescheduleRequestResponse(BaseModel):
    id_permintaan_reschedule: int
    id_pemesanan_konsultasi: int
    id_pasien: int | None = None
    nama_pasien: str | None = None
    id_psikolog: int | None = None
    nama_psikolog: str | None = None
    status: str
    alasan_pasien: str
    catatan_psikolog: str | None = None
    diminta_pada: datetime | None = None
    direspons_pada: datetime | None = None
    tanggal_konsultasi: date | None = None
    waktu_konsultasi: str | None = None
    waktu_selesai: str | None = None


class BookingCheckoutResponse(BaseModel):
    id_pemesanan_konsultasi: int
    id_transaksi_pembayaran: int
    id_pra_asesmen: int
    id_psikolog: int
    nama_psikolog: str | None = None
    tanggal_konsultasi: date
    waktu_konsultasi: str
    mode_konsultasi: ConsultationMode
    order_id: str
    snap_token: str
    redirect_url: str
    client_key: str
    snap_script_url: str
    jumlah_bayar: Decimal
    status_transaksi: str | None = None
    status_konsultasi: str | None = None
    status_pembayaran: str | None = None


class BookingReceiptResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pemesanan_konsultasi: int
    id_pra_asesmen: int | None = None
    id_transaksi_pembayaran: int | None = None
    order_id: str | None = None
    nama_psikolog: str | None = None
    tanggal_konsultasi: date | None = None
    waktu_konsultasi: str | None = None
    waktu_selesai: str | None = None
    mode_konsultasi: str | None = None
    link_pertemuan: str | None = None
    platform_pertemuan: str | None = None
    lokasi_konsultasi: str | None = None
    jumlah_bayar: Decimal | None = None
    metode_pembayaran: str | None = None
    status_transaksi: str | None = None
    status_konsultasi: str | None = None
    status_pembayaran: str | None = None
    tanggal_booking: datetime | None = None
    alasan_pembatalan_pasien: str | None = None
    dibatalkan_pada: datetime | None = None
    reschedule_request: BookingRescheduleRequestResponse | None = None


class BookingAvailabilitySlotResponse(BaseModel):
    id_jadwal_psikolog: int
    id_psikolog: int | None = None
    nama_psikolog: str | None = None
    tanggal_praktik: date | None = None
    waktu_mulai: str | None = None
    waktu_selesai: str | None = None
    lokasi_konsultasi: str | None = None
    tarif_konsultasi: Decimal | None = None


class BookingReminderDispatchResponse(BaseModel):
    checked: int
    sent: int
    skipped: int
    failed: int
    message: str


class BookingStatusRefreshResponse(BaseModel):
    checked: int
    payment_expired: int
    missed: int
    slots_released: int
    message: str
