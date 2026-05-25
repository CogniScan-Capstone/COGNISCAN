from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.hasil_konsultasi import HasilKonsultasi
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.pengguna import Pengguna
from api.models.psikolog import Psikolog
from api.schemas.konsultasi import (
    ConsultationResultCreate,
    ConsultationResultResponse,
)


CONSULTATION_TIMEZONE = ZoneInfo("Asia/Jakarta")
CONSULTATION_DURATION_MINUTES = 60
BLOCKED_RESULT_STATUSES = {
    "dibatalkan",
    "dibatalkan_pasien",
    "payment_kedaluwarsa",
    "ditutup",
}


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _is_paid_booking(booking: PemesananKonsultasi) -> bool:
    transaction = booking.transaksi_pembayaran
    return (
        booking.status_pembayaran == "dibayar"
        or booking.status_konsultasi == "terkonfirmasi"
        or (transaction is not None and transaction.status_transaksi == "berhasil")
    )


def _booking_start_datetime(booking: PemesananKonsultasi) -> datetime | None:
    jadwal = booking.jadwal
    if not jadwal or not jadwal.tanggal_praktik or not jadwal.waktu_mulai:
        return None
    return datetime.combine(jadwal.tanggal_praktik, jadwal.waktu_mulai).replace(
        tzinfo=CONSULTATION_TIMEZONE
    )


async def _get_psikolog(db: AsyncSession, current_user: Pengguna) -> Psikolog:
    result = await db.execute(
        select(Psikolog).where(Psikolog.id_pengguna == current_user.id)
    )
    psikolog = result.scalar_one_or_none()
    if psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil psikolog tidak ditemukan",
        )
    return psikolog


async def _get_psikolog_booking(
    db: AsyncSession,
    current_user: Pengguna,
    id_pemesanan_konsultasi: int,
) -> PemesananKonsultasi:
    psikolog = await _get_psikolog(db=db, current_user=current_user)
    result = await db.execute(
        select(PemesananKonsultasi)
        .where(
            PemesananKonsultasi.id_pemesanan_konsultasi == id_pemesanan_konsultasi,
            PemesananKonsultasi.id_psikolog == psikolog.id_psikolog,
        )
        .options(
            selectinload(PemesananKonsultasi.jadwal),
            selectinload(PemesananKonsultasi.transaksi_pembayaran),
            selectinload(PemesananKonsultasi.hasil_konsultasi),
        )
        .limit(1)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking konsultasi tidak ditemukan untuk psikolog ini",
        )
    return booking


def _validate_result_submission(
    booking: PemesananKonsultasi,
    payload: ConsultationResultCreate,
) -> tuple[str | None, str | None, str | None]:
    if not _is_paid_booking(booking):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hasil konsultasi hanya bisa disimpan untuk booking yang sudah dibayar",
        )

    if booking.status_konsultasi in BLOCKED_RESULT_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking yang sudah dibatalkan, ditutup, atau kedaluwarsa tidak dapat diberi hasil konsultasi",
        )

    start_at = _booking_start_datetime(booking)
    if start_at and start_at > datetime.now(CONSULTATION_TIMEZONE):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hasil konsultasi belum dapat disimpan sebelum jadwal konsultasi dimulai",
        )

    ringkasan = _clean_text(payload.ringkasan_untuk_pasien)
    catatan_internal = _clean_text(payload.catatan_internal)
    rekomendasi = _clean_text(payload.rekomendasi_tindak_lanjut)

    if payload.pasien_hadir and (ringkasan is None or len(ringkasan) < 10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ringkasan untuk pasien wajib diisi minimal 10 karakter jika pasien hadir",
        )

    return ringkasan, catatan_internal, rekomendasi


def _response(
    result: HasilKonsultasi,
    booking: PemesananKonsultasi,
) -> ConsultationResultResponse:
    return ConsultationResultResponse(
        id_hasil_konsultasi=result.id_hasil_konsultasi,
        id_pemesanan_konsultasi=result.id_pemesanan_konsultasi,
        pasien_hadir=result.pasien_hadir,
        ringkasan_untuk_pasien=result.ringkasan_untuk_pasien,
        catatan_internal=result.catatan_internal,
        rekomendasi_tindak_lanjut=result.rekomendasi_tindak_lanjut,
        perlu_sesi_lanjutan=result.perlu_sesi_lanjutan,
        status_konsultasi=booking.status_konsultasi,
        dibuat_pada=result.dibuat_pada,
        diperbarui_pada=result.diperbarui_pada,
    )


async def submit_consultation_result(
    db: AsyncSession,
    current_user: Pengguna,
    id_pemesanan_konsultasi: int,
    payload: ConsultationResultCreate,
) -> ConsultationResultResponse:
    booking = await _get_psikolog_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
    )
    ringkasan, catatan_internal, rekomendasi = _validate_result_submission(
        booking=booking,
        payload=payload,
    )

    result = booking.hasil_konsultasi
    if result is None:
        result = HasilKonsultasi(
            id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        )
        db.add(result)

    result.pasien_hadir = payload.pasien_hadir
    result.ringkasan_untuk_pasien = ringkasan
    result.catatan_evaluasi = ringkasan
    result.catatan_internal = catatan_internal
    result.rekomendasi_tindak_lanjut = rekomendasi
    result.perlu_sesi_lanjutan = payload.perlu_sesi_lanjutan
    result.diperbarui_pada = datetime.now(timezone.utc)

    booking.status_konsultasi = "selesai" if payload.pasien_hadir else "terlewat"

    await db.commit()
    await db.refresh(result)
    await db.refresh(booking)
    return _response(result=result, booking=booking)
