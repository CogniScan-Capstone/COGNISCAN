from __future__ import annotations

from datetime import date as date_type
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.jadwal_psikolog import JadwalPsikolog
from api.models.pasien import Pasien
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.pengguna import Pengguna
from api.models.pra_asesmen import PraAsesmen
from api.models.psikolog import Psikolog
from api.models.sesi_jurnal import SesiJurnal
from api.schemas.jadwal import PsikologScheduleBookingResponse
from api.services.pembayaran_service import sync_payment_status_if_needed


def _as_decimal(value) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def _format_time(value) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat(timespec="minutes")
    return str(value)[:5]


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


def _is_paid_or_confirmed(booking: PemesananKonsultasi) -> bool:
    return (
        booking.status_pembayaran == "dibayar"
        or booking.status_konsultasi == "terkonfirmasi"
        or (
            booking.transaksi_pembayaran is not None
            and booking.transaksi_pembayaran.status_transaksi == "berhasil"
        )
    )


def _to_schedule_response(
    booking: PemesananKonsultasi,
    psikolog: Psikolog,
) -> PsikologScheduleBookingResponse:
    pasien = booking.pasien
    pra_asesmen = booking.pra_asesmen
    sesi_jurnal = pra_asesmen.sesi_jurnal if pra_asesmen else None
    jadwal = booking.jadwal

    return PsikologScheduleBookingResponse(
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        id_pasien=booking.id_pasien,
        nama_pasien=pasien.nama_lengkap if pasien else None,
        email_pasien=pasien.pengguna.email if pasien and pasien.pengguna else None,
        tanggal_konsultasi=jadwal.tanggal_praktik if jadwal else None,
        waktu_mulai=_format_time(jadwal.waktu_mulai) if jadwal else None,
        waktu_selesai=_format_time(jadwal.waktu_selesai) if jadwal else None,
        mode_konsultasi=booking.mode_konsultasi,
        status_konsultasi=booking.status_konsultasi,
        status_pembayaran=booking.status_pembayaran,
        total_biaya=_as_decimal(booking.total_biaya),
        link_pertemuan=booking.link_pertemuan,
        platform_pertemuan=booking.platform_pertemuan,
        lokasi_konsultasi=psikolog.alamat_praktik,
        konteks_pemicu=sesi_jurnal.konteks_pemicu if sesi_jurnal else None,
        indikator_urgensi=pra_asesmen.indikator_urgensi if pra_asesmen else None,
    )


async def list_psikolog_paid_schedule_bookings(
    db: AsyncSession,
    current_user: Pengguna,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
) -> list[PsikologScheduleBookingResponse]:
    psikolog = await _get_psikolog(db=db, current_user=current_user)

    query = (
        select(PemesananKonsultasi)
        .where(PemesananKonsultasi.id_psikolog == psikolog.id_psikolog)
        .where(
            or_(
                PemesananKonsultasi.status_pembayaran == "dibayar",
                PemesananKonsultasi.status_konsultasi == "terkonfirmasi",
                PemesananKonsultasi.status_pembayaran == "belum_bayar",
            )
        )
        .options(
            selectinload(PemesananKonsultasi.pasien).selectinload(Pasien.pengguna),
            selectinload(PemesananKonsultasi.psikolog),
            selectinload(PemesananKonsultasi.jadwal),
            selectinload(PemesananKonsultasi.transaksi_pembayaran),
            selectinload(PemesananKonsultasi.pra_asesmen)
            .selectinload(PraAsesmen.sesi_jurnal)
            .selectinload(SesiJurnal.pasien),
        )
    )

    if start_date or end_date:
        query = query.join(JadwalPsikolog, PemesananKonsultasi.id_jadwal_psikolog == JadwalPsikolog.id_jadwal_psikolog)
    if start_date:
        query = query.where(JadwalPsikolog.tanggal_praktik >= start_date)
    if end_date:
        query = query.where(JadwalPsikolog.tanggal_praktik <= end_date)

    result = await db.execute(query)
    bookings = list(result.scalars().all())

    for booking in bookings:
        if booking.transaksi_pembayaran is not None:
            await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)

    paid_bookings = [booking for booking in bookings if _is_paid_or_confirmed(booking)]
    paid_bookings.sort(
        key=lambda item: (
            item.jadwal.tanggal_praktik if item.jadwal else date_type.min,
            _format_time(item.jadwal.waktu_mulai) if item.jadwal else "",
            item.id_pemesanan_konsultasi,
        )
    )

    return [_to_schedule_response(booking, psikolog) for booking in paid_bookings]
