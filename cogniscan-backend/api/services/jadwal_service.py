from __future__ import annotations

from datetime import date as date_type
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import inspect, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import NO_VALUE
from sqlalchemy.orm import selectinload

from api.models.jadwal_psikolog import JadwalPsikolog
from api.models.pasien import Pasien
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.permintaan_reschedule_konsultasi import PermintaanRescheduleKonsultasi
from api.models.pengguna import Pengguna
from api.models.pra_asesmen import PraAsesmen
from api.models.psikolog import Psikolog
from api.models.sesi_jurnal import SesiJurnal
from api.schemas.jadwal import (
    PsikologAvailabilityBulkCreate,
    PsikologAvailabilityBulkCreateResponse,
    PsikologAvailabilityCreate,
    PsikologAvailabilityDeleteResponse,
    PsikologAvailabilityResponse,
    PsikologAvailabilityUpdate,
    PsikologScheduleBookingResponse,
)
from api.services.booking_service import (
    _reschedule_request_response,
    refresh_consultation_status_if_missed,
)
from api.services.pembayaran_service import sync_payment_status_if_needed


CONSULTATION_DURATION_MINUTES = 60
SCHEDULE_TIMEZONE = ZoneInfo("Asia/Jakarta")
REBOOKABLE_PAYMENT_STATUSES = {"gagal", "kedaluwarsa", "dibatalkan"}
FINISHED_CONSULTATION_STATUSES = {
    "selesai",
    "dibatalkan",
    "dibatalkan_pasien",
    "ditutup",
    "payment_kedaluwarsa",
}


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


def _slot_end_time(tanggal: date_type, start_time):
    start = datetime.combine(tanggal, start_time)
    return (start + timedelta(minutes=CONSULTATION_DURATION_MINUTES)).time()


def _slot_start_datetime(tanggal: date_type, start_time) -> datetime:
    return datetime.combine(tanggal, start_time).replace(tzinfo=SCHEDULE_TIMEZONE)


def _ensure_slot_in_future(tanggal: date_type, start_time) -> None:
    if _slot_start_datetime(tanggal, start_time) <= datetime.now(SCHEDULE_TIMEZONE):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slot jadwal tidak boleh berada di tanggal atau waktu yang sudah lewat",
        )


def _ensure_valid_slot_range(tanggal: date_type, waktu_mulai, waktu_selesai) -> None:
    if waktu_selesai <= waktu_mulai:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Waktu selesai slot harus setelah waktu mulai",
        )
    _ensure_slot_in_future(tanggal, waktu_mulai)


def _booking_blocks_slot(booking: PemesananKonsultasi | None) -> bool:
    if booking is None:
        return False
    if booking.status_pembayaran in REBOOKABLE_PAYMENT_STATUSES:
        return False
    if booking.status_konsultasi in FINISHED_CONSULTATION_STATUSES:
        return False
    return True


def _loaded_booking(slot: JadwalPsikolog) -> PemesananKonsultasi | None:
    loaded_value = inspect(slot).attrs.pemesanan.loaded_value
    if loaded_value is NO_VALUE:
        return None
    return loaded_value


def _availability_status(slot: JadwalPsikolog) -> str:
    if (
        slot.tanggal_praktik
        and slot.waktu_mulai
        and _slot_start_datetime(slot.tanggal_praktik, slot.waktu_mulai)
        <= datetime.now(SCHEDULE_TIMEZONE)
    ):
        return "lampau"
    if _booking_blocks_slot(_loaded_booking(slot)):
        return "terisi"
    if slot.apakah_tersedia is False:
        return "nonaktif"
    return "tersedia"


def _to_availability_response(slot: JadwalPsikolog) -> PsikologAvailabilityResponse:
    booking = _loaded_booking(slot)
    patient = booking.pasien if booking else None
    return PsikologAvailabilityResponse(
        id_jadwal_psikolog=slot.id_jadwal_psikolog,
        id_psikolog=slot.id_psikolog,
        tanggal_praktik=slot.tanggal_praktik,
        waktu_mulai=_format_time(slot.waktu_mulai),
        waktu_selesai=_format_time(slot.waktu_selesai),
        apakah_tersedia=slot.apakah_tersedia,
        status_slot=_availability_status(slot),
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi if booking else None,
        nama_pasien=patient.nama_lengkap if patient else None,
        mode_konsultasi=booking.mode_konsultasi if booking else None,
        status_konsultasi=booking.status_konsultasi if booking else None,
        status_pembayaran=booking.status_pembayaran if booking else None,
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


async def _get_owned_slot(
    db: AsyncSession,
    psikolog: Psikolog,
    id_jadwal_psikolog: int,
) -> JadwalPsikolog:
    result = await db.execute(
        select(JadwalPsikolog)
        .where(
            JadwalPsikolog.id_jadwal_psikolog == id_jadwal_psikolog,
            JadwalPsikolog.id_psikolog == psikolog.id_psikolog,
        )
        .options(
            selectinload(JadwalPsikolog.pemesanan).selectinload(
                PemesananKonsultasi.pasien
            )
        )
    )
    slot = result.scalar_one_or_none()
    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slot jadwal tidak ditemukan",
        )
    return slot


async def _find_overlapping_slot(
    db: AsyncSession,
    id_psikolog: int,
    tanggal_praktik: date_type,
    waktu_mulai,
    waktu_selesai,
    exclude_id: int | None = None,
) -> JadwalPsikolog | None:
    query = select(JadwalPsikolog).where(
        JadwalPsikolog.id_psikolog == id_psikolog,
        JadwalPsikolog.tanggal_praktik == tanggal_praktik,
    )
    if exclude_id is not None:
        query = query.where(JadwalPsikolog.id_jadwal_psikolog != exclude_id)

    result = await db.execute(query)
    for slot in result.scalars().all():
        existing_start = slot.waktu_mulai
        if existing_start is None:
            continue
        existing_end = slot.waktu_selesai or _slot_end_time(
            tanggal_praktik,
            existing_start,
        )
        if existing_start and waktu_mulai < existing_end and waktu_selesai > existing_start:
            return slot
    return None


async def _ensure_no_overlap(
    db: AsyncSession,
    id_psikolog: int,
    tanggal_praktik: date_type,
    waktu_mulai,
    waktu_selesai,
    exclude_id: int | None = None,
) -> None:
    overlapping_slot = await _find_overlapping_slot(
        db=db,
        id_psikolog=id_psikolog,
        tanggal_praktik=tanggal_praktik,
        waktu_mulai=waktu_mulai,
        waktu_selesai=waktu_selesai,
        exclude_id=exclude_id,
    )
    if overlapping_slot is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Slot jadwal bentrok dengan slot yang sudah ada",
        )


async def list_psikolog_availability(
    db: AsyncSession,
    current_user: Pengguna,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
) -> list[PsikologAvailabilityResponse]:
    psikolog = await _get_psikolog(db=db, current_user=current_user)

    query = (
        select(JadwalPsikolog)
        .where(JadwalPsikolog.id_psikolog == psikolog.id_psikolog)
        .options(
            selectinload(JadwalPsikolog.pemesanan).selectinload(
                PemesananKonsultasi.pasien
            )
        )
        .order_by(JadwalPsikolog.tanggal_praktik, JadwalPsikolog.waktu_mulai)
    )
    if start_date:
        query = query.where(JadwalPsikolog.tanggal_praktik >= start_date)
    if end_date:
        query = query.where(JadwalPsikolog.tanggal_praktik <= end_date)

    result = await db.execute(query)
    return [_to_availability_response(slot) for slot in result.scalars().all()]


async def create_psikolog_availability(
    db: AsyncSession,
    current_user: Pengguna,
    payload: PsikologAvailabilityCreate,
) -> PsikologAvailabilityResponse:
    psikolog = await _get_psikolog(db=db, current_user=current_user)
    waktu_selesai = payload.waktu_selesai or _slot_end_time(
        payload.tanggal_praktik,
        payload.waktu_mulai,
    )
    _ensure_valid_slot_range(
        payload.tanggal_praktik,
        payload.waktu_mulai,
        waktu_selesai,
    )
    await _ensure_no_overlap(
        db=db,
        id_psikolog=psikolog.id_psikolog,
        tanggal_praktik=payload.tanggal_praktik,
        waktu_mulai=payload.waktu_mulai,
        waktu_selesai=waktu_selesai,
    )

    slot = JadwalPsikolog(
        id_psikolog=psikolog.id_psikolog,
        tanggal_praktik=payload.tanggal_praktik,
        waktu_mulai=payload.waktu_mulai,
        waktu_selesai=waktu_selesai,
        apakah_tersedia=True,
    )
    db.add(slot)
    await db.commit()
    await db.refresh(slot)
    return _to_availability_response(slot)


async def create_psikolog_availability_bulk(
    db: AsyncSession,
    current_user: Pengguna,
    payload: PsikologAvailabilityBulkCreate,
) -> PsikologAvailabilityBulkCreateResponse:
    psikolog = await _get_psikolog(db=db, current_user=current_user)
    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tanggal akhir tidak boleh sebelum tanggal awal",
        )

    weekdays = set(payload.weekdays)
    if any(day < 0 or day > 6 for day in weekdays):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nilai weekday harus berada di rentang 0 sampai 6",
        )

    total_days = (payload.end_date - payload.start_date).days + 1
    if total_days > 120:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bulk slot dibatasi maksimal 120 hari per request",
        )

    created_slots: list[JadwalPsikolog] = []
    skipped_count = 0
    current_date = payload.start_date
    while current_date <= payload.end_date:
        # Python weekday: Senin=0; API memakai format kalender web: Minggu=0.
        web_weekday = (current_date.weekday() + 1) % 7
        if web_weekday not in weekdays:
            current_date += timedelta(days=1)
            continue

        for slot_input in payload.slots:
            waktu_selesai = slot_input.waktu_selesai or _slot_end_time(
                current_date,
                slot_input.waktu_mulai,
            )
            try:
                _ensure_valid_slot_range(
                    current_date,
                    slot_input.waktu_mulai,
                    waktu_selesai,
                )
            except HTTPException:
                skipped_count += 1
                continue

            overlap = await _find_overlapping_slot(
                db=db,
                id_psikolog=psikolog.id_psikolog,
                tanggal_praktik=current_date,
                waktu_mulai=slot_input.waktu_mulai,
                waktu_selesai=waktu_selesai,
            )
            if overlap is not None:
                skipped_count += 1
                continue

            slot = JadwalPsikolog(
                id_psikolog=psikolog.id_psikolog,
                tanggal_praktik=current_date,
                waktu_mulai=slot_input.waktu_mulai,
                waktu_selesai=waktu_selesai,
                apakah_tersedia=True,
            )
            db.add(slot)
            created_slots.append(slot)
            await db.flush()

        current_date += timedelta(days=1)

    await db.commit()
    return PsikologAvailabilityBulkCreateResponse(
        created_count=len(created_slots),
        skipped_count=skipped_count,
        slots=[_to_availability_response(slot) for slot in created_slots],
    )


async def update_psikolog_availability(
    db: AsyncSession,
    current_user: Pengguna,
    id_jadwal_psikolog: int,
    payload: PsikologAvailabilityUpdate,
) -> PsikologAvailabilityResponse:
    psikolog = await _get_psikolog(db=db, current_user=current_user)
    slot = await _get_owned_slot(
        db=db,
        psikolog=psikolog,
        id_jadwal_psikolog=id_jadwal_psikolog,
    )
    if _booking_blocks_slot(slot.pemesanan):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slot yang sudah memiliki booking aktif tidak dapat diubah",
        )

    tanggal_praktik = payload.tanggal_praktik or slot.tanggal_praktik
    waktu_mulai = payload.waktu_mulai or slot.waktu_mulai
    waktu_selesai = (
        payload.waktu_selesai
        or slot.waktu_selesai
        or _slot_end_time(tanggal_praktik, waktu_mulai)
    )
    _ensure_valid_slot_range(tanggal_praktik, waktu_mulai, waktu_selesai)
    await _ensure_no_overlap(
        db=db,
        id_psikolog=psikolog.id_psikolog,
        tanggal_praktik=tanggal_praktik,
        waktu_mulai=waktu_mulai,
        waktu_selesai=waktu_selesai,
        exclude_id=slot.id_jadwal_psikolog,
    )

    slot.tanggal_praktik = tanggal_praktik
    slot.waktu_mulai = waktu_mulai
    slot.waktu_selesai = waktu_selesai
    if payload.apakah_tersedia is not None:
        slot.apakah_tersedia = payload.apakah_tersedia

    await db.commit()
    await db.refresh(slot)
    return _to_availability_response(slot)


async def delete_psikolog_availability(
    db: AsyncSession,
    current_user: Pengguna,
    id_jadwal_psikolog: int,
) -> PsikologAvailabilityDeleteResponse:
    psikolog = await _get_psikolog(db=db, current_user=current_user)
    slot = await _get_owned_slot(
        db=db,
        psikolog=psikolog,
        id_jadwal_psikolog=id_jadwal_psikolog,
    )
    if _booking_blocks_slot(slot.pemesanan):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slot yang sudah memiliki booking aktif tidak dapat dihapus",
        )

    if slot.pemesanan is not None:
        slot.apakah_tersedia = False
        await db.commit()
        return PsikologAvailabilityDeleteResponse(
            message="Slot dinonaktifkan karena sudah memiliki riwayat booking",
        )

    await db.delete(slot)
    await db.commit()
    return PsikologAvailabilityDeleteResponse(message="Slot jadwal berhasil dihapus")


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
    latest_request = booking.permintaan_reschedule[0] if booking.permintaan_reschedule else None

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
        reschedule_request=_reschedule_request_response(latest_request)
        if latest_request
        else None,
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
            selectinload(PemesananKonsultasi.permintaan_reschedule)
            .selectinload(PermintaanRescheduleKonsultasi.pasien),
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

    status_changed = False
    for booking in bookings:
        if booking.transaksi_pembayaran is not None:
            await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)
        status_changed = refresh_consultation_status_if_missed(booking) or status_changed

    if status_changed:
        await db.commit()

    paid_bookings = [booking for booking in bookings if _is_paid_or_confirmed(booking)]
    paid_bookings.sort(
        key=lambda item: (
            item.jadwal.tanggal_praktik if item.jadwal else date_type.min,
            _format_time(item.jadwal.waktu_mulai) if item.jadwal else "",
            item.id_pemesanan_konsultasi,
        )
    )

    return [_to_schedule_response(booking, psikolog) for booking in paid_bookings]
