from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.hasil_konsultasi import HasilKonsultasi
from api.models.pasien import Pasien
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.pengguna import Pengguna
from api.models.pra_asesmen import PraAsesmen
from api.models.psikolog import Psikolog
from api.models.sesi_jurnal import SesiJurnal
from api.schemas.konsultasi import (
    ConsultationHistoryItem,
    ConsultationResultCreate,
    ConsultationResultResponse,
    PatientConsultationHistoryResponse,
)


CONSULTATION_TIMEZONE = ZoneInfo("Asia/Jakarta")
CONSULTATION_DURATION_MINUTES = 60
BLOCKED_RESULT_STATUSES = {
    "dibatalkan",
    "dibatalkan_pasien",
    "payment_kedaluwarsa",
    "ditutup",
}


@dataclass(frozen=True)
class ConsultationRecordText:
    ringkasan_untuk_pasien: str | None
    catatan_internal: str | None
    rekomendasi_tindak_lanjut: str | None
    keluhan_utama: str | None
    observasi_psikolog: str | None
    asesmen_klinis: str | None
    intervensi_diberikan: str | None
    rencana_tindak_lanjut: str | None
    tingkat_risiko: str | None


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


def _display_time(value) -> str:
    return value.isoformat(timespec="minutes") if value else "-"


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
) -> ConsultationRecordText:
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
    keluhan_utama = _clean_text(payload.keluhan_utama)
    observasi_psikolog = _clean_text(payload.observasi_psikolog)
    asesmen_klinis = _clean_text(payload.asesmen_klinis)
    intervensi_diberikan = _clean_text(payload.intervensi_diberikan)
    rencana_tindak_lanjut = _clean_text(payload.rencana_tindak_lanjut)
    tingkat_risiko = _clean_text(payload.tingkat_risiko)

    if payload.pasien_hadir and (ringkasan is None or len(ringkasan) < 10):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ringkasan untuk pasien wajib diisi minimal 10 karakter jika pasien hadir",
        )

    return ConsultationRecordText(
        ringkasan_untuk_pasien=ringkasan,
        catatan_internal=catatan_internal,
        rekomendasi_tindak_lanjut=rekomendasi,
        keluhan_utama=keluhan_utama,
        observasi_psikolog=observasi_psikolog,
        asesmen_klinis=asesmen_klinis,
        intervensi_diberikan=intervensi_diberikan,
        rencana_tindak_lanjut=rencana_tindak_lanjut,
        tingkat_risiko=tingkat_risiko,
    )


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
        keluhan_utama=result.keluhan_utama,
        observasi_psikolog=result.observasi_psikolog,
        asesmen_klinis=result.asesmen_klinis,
        intervensi_diberikan=result.intervensi_diberikan,
        rencana_tindak_lanjut=result.rencana_tindak_lanjut,
        tingkat_risiko=result.tingkat_risiko,
        versi_format_rekam_medis=result.versi_format_rekam_medis,
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
    record = _validate_result_submission(
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
    result.ringkasan_untuk_pasien = record.ringkasan_untuk_pasien
    result.catatan_evaluasi = record.ringkasan_untuk_pasien
    result.catatan_internal = record.catatan_internal
    result.rekomendasi_tindak_lanjut = record.rekomendasi_tindak_lanjut
    result.perlu_sesi_lanjutan = payload.perlu_sesi_lanjutan
    result.keluhan_utama = record.keluhan_utama
    result.observasi_psikolog = record.observasi_psikolog
    result.asesmen_klinis = record.asesmen_klinis
    result.intervensi_diberikan = record.intervensi_diberikan
    result.rencana_tindak_lanjut = record.rencana_tindak_lanjut
    result.tingkat_risiko = record.tingkat_risiko
    result.versi_format_rekam_medis = "rekam_medis_v1"
    result.diperbarui_pada = datetime.now(timezone.utc)

    booking.status_konsultasi = "selesai" if payload.pasien_hadir else "terlewat"

    await db.commit()
    await db.refresh(result)
    await db.refresh(booking)
    return _response(result=result, booking=booking)


def _history_item(booking: PemesananKonsultasi) -> ConsultationHistoryItem:
    jadwal = booking.jadwal
    pra_asesmen = booking.pra_asesmen
    sesi_jurnal = pra_asesmen.sesi_jurnal if pra_asesmen else None
    result = booking.hasil_konsultasi

    return ConsultationHistoryItem(
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        id_booking_sebelumnya=booking.id_booking_sebelumnya,
        tanggal_konsultasi=jadwal.tanggal_praktik if jadwal else None,
        waktu_mulai=_display_time(jadwal.waktu_mulai) if jadwal else None,
        waktu_selesai=_display_time(jadwal.waktu_selesai) if jadwal else None,
        mode_konsultasi=booking.mode_konsultasi,
        status_konsultasi=booking.status_konsultasi,
        status_pembayaran=booking.status_pembayaran,
        konteks_pemicu=sesi_jurnal.konteks_pemicu if sesi_jurnal else None,
        indikator_urgensi=pra_asesmen.indikator_urgensi if pra_asesmen else None,
        pasien_hadir=result.pasien_hadir if result else None,
        ringkasan_untuk_pasien=result.ringkasan_untuk_pasien if result else None,
        rekomendasi_tindak_lanjut=(
            result.rekomendasi_tindak_lanjut if result else None
        ),
        catatan_internal=result.catatan_internal if result else None,
        keluhan_utama=result.keluhan_utama if result else None,
        observasi_psikolog=result.observasi_psikolog if result else None,
        asesmen_klinis=result.asesmen_klinis if result else None,
        intervensi_diberikan=result.intervensi_diberikan if result else None,
        rencana_tindak_lanjut=result.rencana_tindak_lanjut if result else None,
        tingkat_risiko=result.tingkat_risiko if result else None,
        perlu_sesi_lanjutan=result.perlu_sesi_lanjutan if result else None,
        hasil_dibuat_pada=result.dibuat_pada if result else None,
        hasil_diperbarui_pada=result.diperbarui_pada if result else None,
    )


async def list_psikolog_patient_consultation_history(
    db: AsyncSession,
    current_user: Pengguna,
    id_pasien: int,
) -> PatientConsultationHistoryResponse:
    psikolog = await _get_psikolog(db=db, current_user=current_user)
    result = await db.execute(
        select(PemesananKonsultasi)
        .where(
            PemesananKonsultasi.id_psikolog == psikolog.id_psikolog,
            PemesananKonsultasi.id_pasien == id_pasien,
        )
        .options(
            selectinload(PemesananKonsultasi.pasien).selectinload(Pasien.pengguna),
            selectinload(PemesananKonsultasi.jadwal),
            selectinload(PemesananKonsultasi.hasil_konsultasi),
            selectinload(PemesananKonsultasi.pra_asesmen)
            .selectinload(PraAsesmen.sesi_jurnal)
            .selectinload(SesiJurnal.pasien),
        )
    )
    bookings = list(result.scalars().all())
    if not bookings:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Riwayat konsultasi pasien tidak ditemukan untuk psikolog ini",
        )

    bookings.sort(
        key=lambda booking: (
            booking.jadwal.tanggal_praktik if booking.jadwal else datetime.min.date(),
            booking.jadwal.waktu_mulai
            if booking.jadwal and booking.jadwal.waktu_mulai
            else datetime.min.time(),
            booking.id_pemesanan_konsultasi,
        ),
        reverse=True,
    )
    patient = bookings[0].pasien
    return PatientConsultationHistoryResponse(
        id_pasien=id_pasien,
        nama_pasien=patient.nama_lengkap if patient else None,
        email_pasien=patient.pengguna.email if patient and patient.pengguna else None,
        total_konsultasi=len(bookings),
        items=[_history_item(booking) for booking in bookings],
    )
