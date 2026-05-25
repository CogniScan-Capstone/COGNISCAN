from __future__ import annotations

from datetime import date as date_type
from datetime import datetime, timedelta, timezone
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
from api.schemas.booking import (
    BookingAvailabilitySlotResponse,
    BookingCancelRequest,
    BookingCheckoutRequest,
    BookingCheckoutResponse,
    BookingReceiptResponse,
    BookingRescheduleDecisionRequest,
    BookingRescheduleRejectRequest,
    BookingRescheduleRequest,
    BookingRescheduleRequestCreate,
    BookingRescheduleRequestResponse,
    BookingStatusRefreshResponse,
)
from api.services.pembayaran_service import (
    create_midtrans_payment_for_booking,
    sync_payment_status_if_needed,
)
from api.services.meeting_service import JITSI_PLATFORM_NAME, ensure_online_meeting_room


DEFAULT_CONSULTATION_FEE = Decimal("150000")
CONSULTATION_DURATION_MINUTES = 60
MISSED_GRACE_MINUTES = 15
PENDING_PAYMENT_EXPIRY_MINUTES = 24 * 60
REBOOKABLE_PAYMENT_STATUSES = {"gagal", "kedaluwarsa", "dibatalkan"}
BOOKING_TIMEZONE = ZoneInfo("Asia/Jakarta")
FINAL_CONSULTATION_STATUSES = {
    "selesai",
    "dibatalkan",
    "dibatalkan_pasien",
    "ditutup",
    "payment_kedaluwarsa",
}
MISSABLE_CONSULTATION_STATUSES = {"terkonfirmasi", "reschedule_ditolak"}
ACTIVE_RESCHEDULE_REQUEST_STATUSES = {"pending", "disetujui"}
FOLLOWUP_SOURCE_STATUSES = {"selesai", "ditutup"}


def _as_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _slot_end_time(tanggal: date_type, start_time):
    start = datetime.combine(tanggal, start_time)
    return (start + timedelta(minutes=CONSULTATION_DURATION_MINUTES)).time()


def _display_time(value) -> str:
    return value.isoformat(timespec="minutes") if value else "-"


def _loaded_reschedule_requests(
    booking: PemesananKonsultasi,
) -> list[PermintaanRescheduleKonsultasi]:
    loaded_value = inspect(booking).attrs.permintaan_reschedule.loaded_value
    if loaded_value is NO_VALUE:
        return []
    return list(loaded_value or [])


def _latest_reschedule_request(
    booking: PemesananKonsultasi,
    statuses: set[str] | None = None,
) -> PermintaanRescheduleKonsultasi | None:
    requests = _loaded_reschedule_requests(booking)
    if statuses is not None:
        requests = [request for request in requests if request.status in statuses]
    return requests[0] if requests else None


def _loaded_consultation_result(booking: PemesananKonsultasi):
    loaded_value = inspect(booking).attrs.hasil_konsultasi.loaded_value
    if loaded_value is NO_VALUE:
        return None
    return loaded_value


def _booking_end_datetime(booking: PemesananKonsultasi) -> datetime | None:
    jadwal = booking.jadwal
    if not jadwal or not jadwal.tanggal_praktik or not jadwal.waktu_mulai:
        return None

    end_time = jadwal.waktu_selesai or _slot_end_time(
        jadwal.tanggal_praktik,
        jadwal.waktu_mulai,
    )
    return datetime.combine(jadwal.tanggal_praktik, end_time).replace(
        tzinfo=BOOKING_TIMEZONE
    )


def _booking_start_datetime(booking: PemesananKonsultasi) -> datetime | None:
    jadwal = booking.jadwal
    if not jadwal or not jadwal.tanggal_praktik or not jadwal.waktu_mulai:
        return None
    return datetime.combine(jadwal.tanggal_praktik, jadwal.waktu_mulai).replace(
        tzinfo=BOOKING_TIMEZONE
    )


def _as_utc_datetime(value) -> datetime | None:
    if value is None:
        return None
    if not isinstance(value, datetime):
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _pending_payment_deadline(booking: PemesananKonsultasi) -> datetime | None:
    transaction = booking.transaksi_pembayaran
    if transaction and transaction.batas_waktu_bayar:
        return _as_utc_datetime(transaction.batas_waktu_bayar)

    booked_at = _as_utc_datetime(booking.tanggal_booking)
    if booked_at is None:
        return None
    return booked_at + timedelta(minutes=PENDING_PAYMENT_EXPIRY_MINUTES)


def _release_booking_slot(booking: PemesananKonsultasi, *, only_future: bool = False) -> bool:
    if booking.jadwal is None:
        return False
    if only_future:
        start_at = _booking_start_datetime(booking)
        if start_at is None or start_at <= datetime.now(BOOKING_TIMEZONE):
            return False
    if booking.jadwal.apakah_tersedia is True:
        return False

    booking.jadwal.apakah_tersedia = True
    return True


def _expire_pending_payment_if_due(booking: PemesananKonsultasi) -> tuple[bool, bool]:
    transaction = booking.transaksi_pembayaran
    if transaction is None:
        return False, False
    if booking.status_pembayaran != "belum_bayar":
        return False, False
    if transaction.status_transaksi not in {"menunggu", "proses"}:
        return False, False

    deadline = _pending_payment_deadline(booking)
    if deadline is None or deadline > datetime.now(timezone.utc):
        return False, False

    transaction.status_transaksi = "kedaluwarsa"
    booking.status_pembayaran = "kedaluwarsa"
    booking.status_konsultasi = "payment_kedaluwarsa"
    released = _release_booking_slot(booking)
    return True, released


def _cancel_active_reschedule_requests(booking: PemesananKonsultasi) -> None:
    for request in _loaded_reschedule_requests(booking):
        if request.status in ACTIVE_RESCHEDULE_REQUEST_STATUSES:
            request.status = "dibatalkan"
            request.direspons_pada = datetime.now(timezone.utc)


def refresh_consultation_status_if_missed(booking: PemesananKonsultasi) -> bool:
    if booking.status_konsultasi not in MISSABLE_CONSULTATION_STATUSES:
        return False
    if not _is_paid_booking(booking):
        return False

    end_at = _booking_end_datetime(booking)
    if end_at is None:
        return False

    missed_at = end_at + timedelta(minutes=MISSED_GRACE_MINUTES)
    if missed_at > datetime.now(BOOKING_TIMEZONE):
        return False

    booking.status_konsultasi = "menunggu_konfirmasi_psikolog"
    return True


def _booking_fee(psikolog: Psikolog | None) -> Decimal:
    amount = _as_decimal(psikolog.tarif_konsultasi if psikolog else None)
    return amount if amount > 0 else DEFAULT_CONSULTATION_FEE


def _ensure_schedule_not_in_past(tanggal_konsultasi: date_type, waktu_konsultasi) -> None:
    requested_start = datetime.combine(
        tanggal_konsultasi,
        waktu_konsultasi,
    ).replace(tzinfo=BOOKING_TIMEZONE)
    now = datetime.now(BOOKING_TIMEZONE)

    if requested_start <= now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Jadwal konsultasi tidak boleh menggunakan tanggal atau waktu yang sudah lewat",
        )


def _is_rebookable_booking(booking: PemesananKonsultasi) -> bool:
    transaction = booking.transaksi_pembayaran
    payment_status = booking.status_pembayaran
    transaction_status = transaction.status_transaksi if transaction else None
    return (
        payment_status in REBOOKABLE_PAYMENT_STATUSES
        or transaction_status in REBOOKABLE_PAYMENT_STATUSES
        or booking.status_konsultasi in FINAL_CONSULTATION_STATUSES
    )


def _is_paid_booking(booking: PemesananKonsultasi) -> bool:
    transaction = booking.transaksi_pembayaran
    return (
        booking.status_pembayaran == "dibayar"
        or booking.status_konsultasi == "terkonfirmasi"
        or (transaction is not None and transaction.status_transaksi == "berhasil")
    )


async def _get_patient(db: AsyncSession, current_user: Pengguna) -> Pasien:
    result = await db.execute(
        select(Pasien).where(Pasien.id_pengguna == current_user.id)
    )
    patient = result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil pasien tidak ditemukan",
        )
    return patient


async def _get_checkout_pre_assessment(
    db: AsyncSession,
    patient: Pasien,
    id_pra_asesmen: int | None,
) -> PraAsesmen:
    base_query = (
        select(PraAsesmen)
        .join(SesiJurnal, PraAsesmen.id_sesi_jurnal == SesiJurnal.id_sesi_jurnal)
        .where(SesiJurnal.id_pasien == patient.id_pasien)
        .options(selectinload(PraAsesmen.psikolog))
    )

    if id_pra_asesmen:
        result = await db.execute(
            base_query.where(PraAsesmen.id_pra_asesmen == id_pra_asesmen)
        )
    else:
        result = await db.execute(
            base_query.where(
                PraAsesmen.id_psikolog.is_not(None),
                PraAsesmen.status_validasi == "selesai",
                PraAsesmen.divalidasi_pada.is_not(None),
                PraAsesmen.feedback_psikolog.is_not(None),
                PraAsesmen.feedback_psikolog != "",
            )
            .order_by(PraAsesmen.divalidasi_pada.desc(), PraAsesmen.dibuat_pada.desc())
            .limit(1)
        )

    pra_asesmen = result.scalar_one_or_none()
    if pra_asesmen is None:
        detail = (
            "Pra asesmen tidak ditemukan"
            if id_pra_asesmen
            else "Belum ada feedback psikolog yang siap untuk dibuat booking"
        )
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)

    if pra_asesmen.id_psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pra asesmen belum memiliki psikolog penanggung jawab",
        )

    if (
        pra_asesmen.status_validasi != "selesai"
        or pra_asesmen.divalidasi_pada is None
        or not (
        pra_asesmen.feedback_psikolog and pra_asesmen.feedback_psikolog.strip()
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback psikolog belum selesai sehingga booking belum dapat dibuat",
        )

    return pra_asesmen


async def _get_followup_source_booking(
    db: AsyncSession,
    patient: Pasien,
    id_booking_sebelumnya: int,
) -> PemesananKonsultasi:
    result = await db.execute(
        select(PemesananKonsultasi)
        .where(
            PemesananKonsultasi.id_pemesanan_konsultasi == id_booking_sebelumnya,
            PemesananKonsultasi.id_pasien == patient.id_pasien,
        )
        .options(
            selectinload(PemesananKonsultasi.psikolog),
            selectinload(PemesananKonsultasi.jadwal),
            selectinload(PemesananKonsultasi.hasil_konsultasi),
            selectinload(PemesananKonsultasi.transaksi_pembayaran),
        )
        .limit(1)
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking sebelumnya tidak ditemukan",
        )

    if booking.id_psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking sebelumnya belum memiliki psikolog",
        )

    if booking.status_konsultasi not in FOLLOWUP_SOURCE_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking lanjutan hanya bisa dibuat dari konsultasi yang sudah selesai atau ditutup",
        )

    return booking


async def _get_available_slot(
    db: AsyncSession,
    pra_asesmen: PraAsesmen,
    payload: BookingCheckoutRequest,
) -> JadwalPsikolog:
    return await _get_available_slot_for_psikolog(
        db=db,
        id_psikolog=pra_asesmen.id_psikolog or 0,
        tanggal_konsultasi=payload.tanggal_konsultasi,
        waktu_konsultasi=payload.waktu_konsultasi,
    )


async def _get_available_slot_for_psikolog(
    db: AsyncSession,
    id_psikolog: int,
    tanggal_konsultasi: date_type,
    waktu_konsultasi,
    current_slot_id: int | None = None,
) -> JadwalPsikolog:
    result = await db.execute(
        select(JadwalPsikolog)
        .where(
            JadwalPsikolog.id_psikolog == id_psikolog,
            JadwalPsikolog.tanggal_praktik == tanggal_konsultasi,
            JadwalPsikolog.waktu_mulai == waktu_konsultasi,
        )
        .limit(1)
    )
    slot = result.scalars().first()

    if slot is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Slot jadwal belum dibuat oleh psikolog atau tidak ditemukan",
        )

    if slot.apakah_tersedia is False and slot.id_jadwal_psikolog != current_slot_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Slot jadwal ini sudah tidak tersedia",
        )

    return slot


def _availability_range(
    start_date: date_type | None,
    end_date: date_type | None,
) -> tuple[date_type, date_type]:
    today = datetime.now(BOOKING_TIMEZONE).date()
    resolved_start = start_date or today
    resolved_end = end_date or (resolved_start + timedelta(days=30))

    if resolved_end < resolved_start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tanggal akhir tidak boleh sebelum tanggal awal",
        )

    if (resolved_end - resolved_start).days > 120:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rentang pencarian slot dibatasi maksimal 120 hari",
        )

    return resolved_start, resolved_end


def _is_future_slot(slot: JadwalPsikolog) -> bool:
    if not slot.tanggal_praktik or not slot.waktu_mulai:
        return False
    start = datetime.combine(slot.tanggal_praktik, slot.waktu_mulai).replace(
        tzinfo=BOOKING_TIMEZONE
    )
    return start > datetime.now(BOOKING_TIMEZONE)


def _availability_slot_response(
    slot: JadwalPsikolog,
    psikolog: Psikolog | None,
) -> BookingAvailabilitySlotResponse:
    return BookingAvailabilitySlotResponse(
        id_jadwal_psikolog=slot.id_jadwal_psikolog,
        id_psikolog=slot.id_psikolog,
        nama_psikolog=psikolog.nama_lengkap if psikolog else None,
        tanggal_praktik=slot.tanggal_praktik,
        waktu_mulai=_display_time(slot.waktu_mulai),
        waktu_selesai=_display_time(slot.waktu_selesai),
        lokasi_konsultasi=psikolog.alamat_praktik if psikolog else None,
        tarif_konsultasi=_booking_fee(psikolog),
    )


def _reschedule_request_response(
    request: PermintaanRescheduleKonsultasi,
) -> BookingRescheduleRequestResponse:
    booking = request.pemesanan
    patient = booking.pasien if booking and booking.pasien else request.pasien
    psikolog = booking.psikolog if booking and booking.psikolog else request.psikolog
    jadwal = booking.jadwal if booking else None

    return BookingRescheduleRequestResponse(
        id_permintaan_reschedule=request.id_permintaan_reschedule,
        id_pemesanan_konsultasi=request.id_pemesanan_konsultasi,
        id_pasien=request.id_pasien,
        nama_pasien=patient.nama_lengkap if patient else None,
        id_psikolog=request.id_psikolog,
        nama_psikolog=psikolog.nama_lengkap if psikolog else None,
        status=request.status,
        alasan_pasien=request.alasan_pasien,
        catatan_psikolog=request.catatan_psikolog,
        diminta_pada=request.diminta_pada,
        direspons_pada=request.direspons_pada,
        tanggal_konsultasi=jadwal.tanggal_praktik if jadwal else None,
        waktu_konsultasi=_display_time(jadwal.waktu_mulai) if jadwal else None,
        waktu_selesai=_display_time(jadwal.waktu_selesai) if jadwal else None,
    )


async def _list_available_slots_for_psikolog(
    db: AsyncSession,
    psikolog: Psikolog | None,
    id_psikolog: int,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
) -> list[BookingAvailabilitySlotResponse]:
    resolved_start, resolved_end = _availability_range(start_date, end_date)

    result = await db.execute(
        select(JadwalPsikolog)
        .where(
            JadwalPsikolog.id_psikolog == id_psikolog,
            JadwalPsikolog.tanggal_praktik >= resolved_start,
            JadwalPsikolog.tanggal_praktik <= resolved_end,
            JadwalPsikolog.apakah_tersedia.is_(True),
        )
        .order_by(JadwalPsikolog.tanggal_praktik, JadwalPsikolog.waktu_mulai)
    )
    slots = [slot for slot in result.scalars().all() if _is_future_slot(slot)]
    return [_availability_slot_response(slot, psikolog) for slot in slots]


async def list_patient_booking_availability(
    db: AsyncSession,
    current_user: Pengguna,
    id_pra_asesmen: int | None = None,
    id_booking_sebelumnya: int | None = None,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
) -> list[BookingAvailabilitySlotResponse]:
    patient = await _get_patient(db=db, current_user=current_user)
    if id_pra_asesmen and id_booking_sebelumnya:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pilih salah satu konteks booking: pra asesmen atau booking sebelumnya",
        )

    if id_booking_sebelumnya:
        source_booking = await _get_followup_source_booking(
            db=db,
            patient=patient,
            id_booking_sebelumnya=id_booking_sebelumnya,
        )
        return await _list_available_slots_for_psikolog(
            db=db,
            psikolog=source_booking.psikolog,
            id_psikolog=source_booking.id_psikolog or 0,
            start_date=start_date,
            end_date=end_date,
        )

    pra_asesmen = await _get_checkout_pre_assessment(
        db=db,
        patient=patient,
        id_pra_asesmen=id_pra_asesmen,
    )
    return await _list_available_slots_for_psikolog(
        db=db,
        psikolog=pra_asesmen.psikolog,
        id_psikolog=pra_asesmen.id_psikolog or 0,
        start_date=start_date,
        end_date=end_date,
    )


async def list_patient_reschedule_availability(
    db: AsyncSession,
    current_user: Pengguna,
    id_pemesanan_konsultasi: int,
    start_date: date_type | None = None,
    end_date: date_type | None = None,
) -> list[BookingAvailabilitySlotResponse]:
    booking = await _get_patient_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
    )

    if booking.transaksi_pembayaran is not None:
        await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)

    if not _is_paid_booking(booking):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slot reschedule hanya tersedia untuk booking yang sudah dibayar",
        )

    if not booking.id_psikolog:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking belum memiliki psikolog",
        )

    approved_request = _latest_reschedule_request(booking, {"disetujui"})
    if booking.status_konsultasi != "reschedule_disetujui" or approved_request is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reschedule belum disetujui psikolog",
        )

    return await _list_available_slots_for_psikolog(
        db=db,
        psikolog=booking.psikolog,
        id_psikolog=booking.id_psikolog,
        start_date=start_date,
        end_date=end_date,
    )


async def _ensure_pre_assessment_has_no_active_booking(
    db: AsyncSession,
    patient: Pasien,
    pra_asesmen: PraAsesmen,
) -> None:
    result = await db.execute(
        select(PemesananKonsultasi)
        .where(
            PemesananKonsultasi.id_pasien == patient.id_pasien,
            PemesananKonsultasi.id_pra_asesmen == pra_asesmen.id_pra_asesmen,
        )
        .options(
            selectinload(PemesananKonsultasi.transaksi_pembayaran),
            selectinload(PemesananKonsultasi.jadwal),
        )
        .order_by(PemesananKonsultasi.tanggal_booking.desc())
    )
    existing_bookings = list(result.scalars().all())

    for booking in existing_bookings:
        if booking.transaksi_pembayaran is not None:
            await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)
        _expire_pending_payment_if_due(booking)

    active_booking = next(
        (booking for booking in existing_bookings if not _is_rebookable_booking(booking)),
        None,
    )
    if active_booking is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Feedback ini sudah memiliki booking aktif. "
                "Buka detail feedback atau tab Booking untuk melihat jadwal dan pembayaran."
            ),
        )


async def _ensure_patient_has_no_active_booking_with_psikolog(
    db: AsyncSession,
    patient: Pasien,
    id_psikolog: int,
) -> None:
    result = await db.execute(
        select(PemesananKonsultasi)
        .where(
            PemesananKonsultasi.id_pasien == patient.id_pasien,
            PemesananKonsultasi.id_psikolog == id_psikolog,
        )
        .options(
            selectinload(PemesananKonsultasi.transaksi_pembayaran),
            selectinload(PemesananKonsultasi.jadwal),
        )
        .order_by(PemesananKonsultasi.tanggal_booking.desc())
    )
    existing_bookings = list(result.scalars().all())

    for booking in existing_bookings:
        if booking.transaksi_pembayaran is not None:
            await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)
        _expire_pending_payment_if_due(booking)

    active_booking = next(
        (booking for booking in existing_bookings if not _is_rebookable_booking(booking)),
        None,
    )
    if active_booking is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Kamu masih memiliki booking aktif dengan psikolog ini. "
                "Selesaikan, reschedule, atau batalkan booking tersebut sebelum membuat sesi baru."
            ),
        )


async def create_booking_checkout(
    db: AsyncSession,
    current_user: Pengguna,
    payload: BookingCheckoutRequest,
) -> BookingCheckoutResponse:
    _ensure_schedule_not_in_past(payload.tanggal_konsultasi, payload.waktu_konsultasi)

    patient = await _get_patient(db=db, current_user=current_user)
    if payload.id_pra_asesmen and payload.id_booking_sebelumnya:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Checkout hanya boleh memakai salah satu konteks: pra asesmen atau booking sebelumnya",
        )

    if payload.id_booking_sebelumnya:
        source_booking = await _get_followup_source_booking(
            db=db,
            patient=patient,
            id_booking_sebelumnya=payload.id_booking_sebelumnya,
        )
        await _ensure_patient_has_no_active_booking_with_psikolog(
            db=db,
            patient=patient,
            id_psikolog=source_booking.id_psikolog or 0,
        )
        slot = await _get_available_slot_for_psikolog(
            db=db,
            id_psikolog=source_booking.id_psikolog or 0,
            tanggal_konsultasi=payload.tanggal_konsultasi,
            waktu_konsultasi=payload.waktu_konsultasi,
        )

        amount = _booking_fee(source_booking.psikolog)
        booking = PemesananKonsultasi(
            id_pasien=patient.id_pasien,
            id_psikolog=source_booking.id_psikolog,
            id_jadwal_psikolog=slot.id_jadwal_psikolog,
            id_pra_asesmen=None,
            id_booking_sebelumnya=source_booking.id_pemesanan_konsultasi,
            mode_konsultasi=payload.mode_konsultasi,
            platform_pertemuan=JITSI_PLATFORM_NAME if payload.mode_konsultasi == "online" else None,
            total_biaya=amount,
            status_konsultasi="menunggu_pembayaran",
            status_pembayaran="belum_bayar",
        )
        db.add(booking)
        await db.flush()

        slot.apakah_tersedia = False

        payment = await create_midtrans_payment_for_booking(
            db=db,
            current_user=current_user,
            id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        )

        return BookingCheckoutResponse(
            id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
            id_transaksi_pembayaran=payment.id_transaksi_pembayaran,
            id_pra_asesmen=None,
            id_booking_sebelumnya=source_booking.id_pemesanan_konsultasi,
            id_psikolog=source_booking.id_psikolog or 0,
            nama_psikolog=source_booking.psikolog.nama_lengkap if source_booking.psikolog else None,
            tanggal_konsultasi=payload.tanggal_konsultasi,
            waktu_konsultasi=_display_time(payload.waktu_konsultasi),
            mode_konsultasi=payload.mode_konsultasi,
            order_id=payment.order_id,
            snap_token=payment.snap_token,
            redirect_url=payment.redirect_url,
            client_key=payment.client_key,
            snap_script_url=payment.snap_script_url,
            jumlah_bayar=payment.jumlah_bayar,
            status_transaksi=payment.status_transaksi,
            status_konsultasi=booking.status_konsultasi,
            status_pembayaran=booking.status_pembayaran,
        )

    pra_asesmen = await _get_checkout_pre_assessment(
        db=db,
        patient=patient,
        id_pra_asesmen=payload.id_pra_asesmen,
    )
    await _ensure_pre_assessment_has_no_active_booking(
        db=db,
        patient=patient,
        pra_asesmen=pra_asesmen,
    )
    await _ensure_patient_has_no_active_booking_with_psikolog(
        db=db,
        patient=patient,
        id_psikolog=pra_asesmen.id_psikolog or 0,
    )
    slot = await _get_available_slot(db=db, pra_asesmen=pra_asesmen, payload=payload)

    amount = _booking_fee(pra_asesmen.psikolog)
    booking = PemesananKonsultasi(
        id_pasien=patient.id_pasien,
        id_psikolog=pra_asesmen.id_psikolog,
        id_jadwal_psikolog=slot.id_jadwal_psikolog,
        id_pra_asesmen=pra_asesmen.id_pra_asesmen,
        mode_konsultasi=payload.mode_konsultasi,
        platform_pertemuan=JITSI_PLATFORM_NAME if payload.mode_konsultasi == "online" else None,
        total_biaya=amount,
        status_konsultasi="menunggu_pembayaran",
        status_pembayaran="belum_bayar",
    )
    db.add(booking)
    await db.flush()

    # Reserve the selected slot while Midtrans payment is pending.
    slot.apakah_tersedia = False

    payment = await create_midtrans_payment_for_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
    )

    return BookingCheckoutResponse(
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        id_transaksi_pembayaran=payment.id_transaksi_pembayaran,
        id_pra_asesmen=pra_asesmen.id_pra_asesmen,
        id_booking_sebelumnya=None,
        id_psikolog=pra_asesmen.id_psikolog or 0,
        nama_psikolog=pra_asesmen.psikolog.nama_lengkap if pra_asesmen.psikolog else None,
        tanggal_konsultasi=payload.tanggal_konsultasi,
        waktu_konsultasi=_display_time(payload.waktu_konsultasi),
        mode_konsultasi=payload.mode_konsultasi,
        order_id=payment.order_id,
        snap_token=payment.snap_token,
        redirect_url=payment.redirect_url,
        client_key=payment.client_key,
        snap_script_url=payment.snap_script_url,
        jumlah_bayar=payment.jumlah_bayar,
        status_transaksi=payment.status_transaksi,
        status_konsultasi=booking.status_konsultasi,
        status_pembayaran=booking.status_pembayaran,
    )


async def _get_patient_booking(
    db: AsyncSession,
    current_user: Pengguna,
    id_pemesanan_konsultasi: int,
) -> PemesananKonsultasi:
    result = await db.execute(
        select(PemesananKonsultasi)
        .join(Pasien, PemesananKonsultasi.id_pasien == Pasien.id_pasien)
        .where(
            PemesananKonsultasi.id_pemesanan_konsultasi == id_pemesanan_konsultasi,
            Pasien.id_pengguna == current_user.id,
        )
        .options(
            selectinload(PemesananKonsultasi.pasien),
            selectinload(PemesananKonsultasi.psikolog),
            selectinload(PemesananKonsultasi.jadwal),
            selectinload(PemesananKonsultasi.transaksi_pembayaran),
            selectinload(PemesananKonsultasi.hasil_konsultasi),
            selectinload(PemesananKonsultasi.permintaan_reschedule),
        )
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking konsultasi tidak ditemukan",
        )
    return booking


async def request_booking_reschedule(
    db: AsyncSession,
    current_user: Pengguna,
    id_pemesanan_konsultasi: int,
    payload: BookingRescheduleRequestCreate,
) -> BookingReceiptResponse:
    booking = await _get_patient_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
    )

    if booking.transaksi_pembayaran is not None:
        await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)
    refresh_consultation_status_if_missed(booking)

    if not _is_paid_booking(booking):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pengajuan reschedule hanya tersedia untuk booking yang sudah dibayar",
        )

    if booking.status_konsultasi in FINAL_CONSULTATION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking yang sudah selesai, ditutup, atau dibatalkan tidak dapat diajukan reschedule",
        )

    active_request = _latest_reschedule_request(
        booking,
        ACTIVE_RESCHEDULE_REQUEST_STATUSES,
    )
    if active_request is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Booking ini sudah memiliki pengajuan reschedule aktif",
        )

    alasan = payload.alasan_pasien.strip()
    request = PermintaanRescheduleKonsultasi(
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        id_pasien=booking.id_pasien,
        id_psikolog=booking.id_psikolog,
        alasan_pasien=alasan,
        status="pending",
    )
    request.pemesanan = booking
    db.add(request)
    await db.flush()

    booking.status_konsultasi = "menunggu_reschedule"
    await db.commit()
    await db.refresh(request)
    return _receipt_response(booking, request)


async def close_missed_booking(
    db: AsyncSession,
    current_user: Pengguna,
    id_pemesanan_konsultasi: int,
) -> BookingReceiptResponse:
    booking = await _get_patient_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
    )

    if booking.transaksi_pembayaran is not None:
        await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)
    refresh_consultation_status_if_missed(booking)

    active_request = _latest_reschedule_request(
        booking,
        ACTIVE_RESCHEDULE_REQUEST_STATUSES,
    )
    if active_request is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Booking masih memiliki pengajuan reschedule aktif",
        )

    if booking.status_konsultasi != "terlewat":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking hanya dapat ditutup setelah statusnya terlewat",
        )

    booking.status_konsultasi = "ditutup"
    await db.commit()
    return _receipt_response(booking)


async def cancel_patient_booking(
    db: AsyncSession,
    current_user: Pengguna,
    id_pemesanan_konsultasi: int,
    payload: BookingCancelRequest,
) -> BookingReceiptResponse:
    booking = await _get_patient_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
    )

    if booking.transaksi_pembayaran is not None:
        await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)
    expired, _ = _expire_pending_payment_if_due(booking)
    refresh_consultation_status_if_missed(booking)
    cancellation_reason = (
        payload.alasan_pasien.strip()
        if payload.alasan_pasien and payload.alasan_pasien.strip()
        else None
    )

    if booking.status_konsultasi in FINAL_CONSULTATION_STATUSES:
        if expired or booking.status_konsultasi == "payment_kedaluwarsa":
            await db.commit()
            return _receipt_response(booking)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking ini sudah berada pada status final",
        )

    is_paid = _is_paid_booking(booking)
    if not is_paid:
        if expired:
            await db.commit()
            return _receipt_response(booking)

        if booking.transaksi_pembayaran is not None:
            booking.transaksi_pembayaran.status_transaksi = "dibatalkan"
        booking.status_pembayaran = "dibatalkan"
        booking.status_konsultasi = "dibatalkan"
        booking.alasan_pembatalan_pasien = cancellation_reason
        booking.dibatalkan_pada = datetime.now(timezone.utc)
        _release_booking_slot(booking)
        _cancel_active_reschedule_requests(booking)
        await db.commit()
        return _receipt_response(booking)

    if booking.status_konsultasi == "terlewat":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking yang sudah terlewat dapat ditutup atau diajukan penjadwalan ulang",
        )

    start_at = _booking_start_datetime(booking)
    if start_at is None or start_at <= datetime.now(BOOKING_TIMEZONE):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Konsultasi yang sudah masuk waktu sesi tidak dapat dibatalkan dari alur ini",
        )

    if not payload.konfirmasi_no_refund:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Konfirmasi kebijakan no-refund wajib dicentang untuk membatalkan konsultasi berbayar",
        )

    booking.status_pembayaran = "dibayar"
    booking.status_konsultasi = "dibatalkan_pasien"
    booking.alasan_pembatalan_pasien = cancellation_reason
    booking.dibatalkan_pada = datetime.now(timezone.utc)
    _release_booking_slot(booking, only_future=True)
    _cancel_active_reschedule_requests(booking)
    await db.commit()
    return _receipt_response(booking)


async def reschedule_paid_booking(
    db: AsyncSession,
    current_user: Pengguna,
    id_pemesanan_konsultasi: int,
    payload: BookingRescheduleRequest,
) -> BookingReceiptResponse:
    _ensure_schedule_not_in_past(payload.tanggal_konsultasi, payload.waktu_konsultasi)

    booking = await _get_patient_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
    )

    if booking.transaksi_pembayaran is not None:
        await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)
    refresh_consultation_status_if_missed(booking)

    if not _is_paid_booking(booking):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reschedule hanya tersedia untuk booking yang sudah dibayar",
        )

    if booking.status_konsultasi in FINAL_CONSULTATION_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking yang sudah selesai atau dibatalkan tidak dapat di-reschedule",
        )

    if not booking.id_psikolog:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking belum memiliki psikolog",
        )

    approved_request = _latest_reschedule_request(booking, {"disetujui"})
    if booking.status_konsultasi != "reschedule_disetujui" or approved_request is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reschedule belum disetujui psikolog",
        )

    old_slot = booking.jadwal
    new_slot = await _get_available_slot_for_psikolog(
        db=db,
        id_psikolog=booking.id_psikolog,
        tanggal_konsultasi=payload.tanggal_konsultasi,
        waktu_konsultasi=payload.waktu_konsultasi,
        current_slot_id=booking.id_jadwal_psikolog,
    )

    if old_slot is not None and old_slot.id_jadwal_psikolog != new_slot.id_jadwal_psikolog:
        old_slot.apakah_tersedia = True

    new_slot.apakah_tersedia = False
    booking.id_jadwal_psikolog = new_slot.id_jadwal_psikolog
    booking.jadwal = new_slot
    booking.mode_konsultasi = payload.mode_konsultasi
    booking.status_pembayaran = "dibayar"
    booking.status_konsultasi = "terkonfirmasi"

    if payload.mode_konsultasi == "online":
        booking.platform_pertemuan = JITSI_PLATFORM_NAME
        ensure_online_meeting_room(booking)
    else:
        booking.platform_pertemuan = None
        booking.link_pertemuan = None

    approved_request.status = "selesai"

    await db.commit()
    return _receipt_response(booking)


def _receipt_response(
    booking: PemesananKonsultasi,
    reschedule_request: PermintaanRescheduleKonsultasi | None = None,
) -> BookingReceiptResponse:
    transaction = booking.transaksi_pembayaran
    latest_request = reschedule_request or _latest_reschedule_request(booking)
    consultation_result = _loaded_consultation_result(booking)
    return BookingReceiptResponse(
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        id_pra_asesmen=booking.id_pra_asesmen,
        id_booking_sebelumnya=booking.id_booking_sebelumnya,
        id_transaksi_pembayaran=transaction.id_transaksi_pembayaran if transaction else None,
        order_id=transaction.midtrans_order_id if transaction else None,
        nama_psikolog=booking.psikolog.nama_lengkap if booking.psikolog else None,
        tanggal_konsultasi=booking.jadwal.tanggal_praktik if booking.jadwal else None,
        waktu_konsultasi=_display_time(booking.jadwal.waktu_mulai)
        if booking.jadwal
        else None,
        waktu_selesai=_display_time(booking.jadwal.waktu_selesai)
        if booking.jadwal
        else None,
        mode_konsultasi=booking.mode_konsultasi,
        link_pertemuan=booking.link_pertemuan,
        platform_pertemuan=booking.platform_pertemuan,
        lokasi_konsultasi=booking.psikolog.alamat_praktik if booking.psikolog else None,
        jumlah_bayar=_as_decimal(transaction.jumlah_bayar)
        if transaction and transaction.jumlah_bayar is not None
        else _as_decimal(booking.total_biaya),
        metode_pembayaran=transaction.metode_pembayaran if transaction else None,
        status_transaksi=transaction.status_transaksi if transaction else None,
        status_konsultasi=booking.status_konsultasi,
        status_pembayaran=booking.status_pembayaran,
        tanggal_booking=booking.tanggal_booking,
        alasan_pembatalan_pasien=booking.alasan_pembatalan_pasien,
        dibatalkan_pada=booking.dibatalkan_pada,
        hasil_konsultasi_ringkasan=(
            consultation_result.ringkasan_untuk_pasien
            if consultation_result
            else None
        ),
        hasil_konsultasi_rekomendasi=(
            consultation_result.rekomendasi_tindak_lanjut
            if consultation_result
            else None
        ),
        hasil_konsultasi_pasien_hadir=(
            consultation_result.pasien_hadir
            if consultation_result
            else None
        ),
        perlu_sesi_lanjutan=(
            consultation_result.perlu_sesi_lanjutan
            if consultation_result
            else None
        ),
        hasil_konsultasi_dibuat_pada=(
            consultation_result.dibuat_pada
            if consultation_result
            else None
        ),
        reschedule_request=_reschedule_request_response(latest_request)
        if latest_request
        else None,
    )


async def list_patient_bookings(
    db: AsyncSession,
    current_user: Pengguna,
) -> list[BookingReceiptResponse]:
    patient = await _get_patient(db=db, current_user=current_user)
    result = await db.execute(
        select(PemesananKonsultasi)
        .where(PemesananKonsultasi.id_pasien == patient.id_pasien)
        .options(
            selectinload(PemesananKonsultasi.pasien),
            selectinload(PemesananKonsultasi.psikolog),
            selectinload(PemesananKonsultasi.jadwal),
            selectinload(PemesananKonsultasi.transaksi_pembayaran),
            selectinload(PemesananKonsultasi.hasil_konsultasi),
            selectinload(PemesananKonsultasi.permintaan_reschedule),
        )
        .order_by(PemesananKonsultasi.tanggal_booking.desc())
    )
    bookings = list(result.scalars().all())

    status_changed = False
    for booking in bookings:
        if booking.transaksi_pembayaran is not None:
            await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)
        expired, _released = _expire_pending_payment_if_due(booking)
        status_changed = expired or status_changed
        status_changed = refresh_consultation_status_if_missed(booking) or status_changed

    if status_changed:
        await db.commit()

    return [_receipt_response(booking) for booking in bookings]


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


async def list_psikolog_reschedule_requests(
    db: AsyncSession,
    current_user: Pengguna,
    request_status: str | None = "pending",
) -> list[BookingRescheduleRequestResponse]:
    psikolog = await _get_psikolog(db=db, current_user=current_user)
    query = (
        select(PermintaanRescheduleKonsultasi)
        .where(PermintaanRescheduleKonsultasi.id_psikolog == psikolog.id_psikolog)
        .options(
            selectinload(PermintaanRescheduleKonsultasi.pasien),
            selectinload(PermintaanRescheduleKonsultasi.psikolog),
            selectinload(PermintaanRescheduleKonsultasi.pemesanan)
            .selectinload(PemesananKonsultasi.pasien),
            selectinload(PermintaanRescheduleKonsultasi.pemesanan)
            .selectinload(PemesananKonsultasi.psikolog),
            selectinload(PermintaanRescheduleKonsultasi.pemesanan)
            .selectinload(PemesananKonsultasi.jadwal),
        )
        .order_by(PermintaanRescheduleKonsultasi.diminta_pada.desc())
    )
    if request_status:
        query = query.where(PermintaanRescheduleKonsultasi.status == request_status)

    result = await db.execute(query)
    return [_reschedule_request_response(request) for request in result.scalars().all()]


async def _get_psikolog_reschedule_request(
    db: AsyncSession,
    current_user: Pengguna,
    id_permintaan_reschedule: int,
) -> PermintaanRescheduleKonsultasi:
    psikolog = await _get_psikolog(db=db, current_user=current_user)
    result = await db.execute(
        select(PermintaanRescheduleKonsultasi)
        .where(
            PermintaanRescheduleKonsultasi.id_permintaan_reschedule
            == id_permintaan_reschedule,
            PermintaanRescheduleKonsultasi.id_psikolog == psikolog.id_psikolog,
        )
        .options(
            selectinload(PermintaanRescheduleKonsultasi.pasien),
            selectinload(PermintaanRescheduleKonsultasi.psikolog),
            selectinload(PermintaanRescheduleKonsultasi.pemesanan)
            .selectinload(PemesananKonsultasi.pasien),
            selectinload(PermintaanRescheduleKonsultasi.pemesanan)
            .selectinload(PemesananKonsultasi.psikolog),
            selectinload(PermintaanRescheduleKonsultasi.pemesanan)
            .selectinload(PemesananKonsultasi.jadwal),
            selectinload(PermintaanRescheduleKonsultasi.pemesanan)
            .selectinload(PemesananKonsultasi.transaksi_pembayaran),
        )
    )
    request = result.scalar_one_or_none()
    if request is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pengajuan reschedule tidak ditemukan",
        )
    return request


async def approve_psikolog_reschedule_request(
    db: AsyncSession,
    current_user: Pengguna,
    id_permintaan_reschedule: int,
    payload: BookingRescheduleDecisionRequest,
) -> BookingRescheduleRequestResponse:
    request = await _get_psikolog_reschedule_request(
        db=db,
        current_user=current_user,
        id_permintaan_reschedule=id_permintaan_reschedule,
    )
    if request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pengajuan reschedule ini sudah diproses",
        )

    booking = request.pemesanan
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking pengajuan reschedule tidak ditemukan",
        )
    if booking.transaksi_pembayaran is not None:
        await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)

    request.status = "disetujui"
    request.catatan_psikolog = payload.catatan_psikolog.strip() if payload.catatan_psikolog else None
    request.direspons_pada = datetime.now(timezone.utc)
    booking.status_konsultasi = "reschedule_disetujui"

    await db.commit()
    return _reschedule_request_response(request)


async def reject_psikolog_reschedule_request(
    db: AsyncSession,
    current_user: Pengguna,
    id_permintaan_reschedule: int,
    payload: BookingRescheduleRejectRequest,
) -> BookingRescheduleRequestResponse:
    request = await _get_psikolog_reschedule_request(
        db=db,
        current_user=current_user,
        id_permintaan_reschedule=id_permintaan_reschedule,
    )
    if request.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pengajuan reschedule ini sudah diproses",
        )

    booking = request.pemesanan
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking pengajuan reschedule tidak ditemukan",
        )
    if booking.transaksi_pembayaran is not None:
        await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)

    request.status = "ditolak"
    request.catatan_psikolog = payload.catatan_psikolog.strip()
    request.direspons_pada = datetime.now(timezone.utc)
    booking.status_konsultasi = "reschedule_ditolak"
    refresh_consultation_status_if_missed(booking)

    await db.commit()
    return _reschedule_request_response(request)


async def refresh_booking_statuses(
    db: AsyncSession,
) -> BookingStatusRefreshResponse:
    result = await db.execute(
        select(PemesananKonsultasi)
        .where(
            or_(
                PemesananKonsultasi.status_pembayaran == "belum_bayar",
                PemesananKonsultasi.status_konsultasi.in_(
                    list(MISSABLE_CONSULTATION_STATUSES)
                ),
            )
        )
        .options(
            selectinload(PemesananKonsultasi.pasien),
            selectinload(PemesananKonsultasi.psikolog),
            selectinload(PemesananKonsultasi.jadwal),
            selectinload(PemesananKonsultasi.transaksi_pembayaran),
            selectinload(PemesananKonsultasi.permintaan_reschedule),
        )
    )
    bookings = list(result.scalars().all())

    payment_expired = 0
    missed = 0
    slots_released = 0
    changed = False

    for booking in bookings:
        if booking.transaksi_pembayaran is not None:
            await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)

        expired, released = _expire_pending_payment_if_due(booking)
        if expired:
            payment_expired += 1
            changed = True
        if released:
            slots_released += 1

        if refresh_consultation_status_if_missed(booking):
            missed += 1
            changed = True

    if changed:
        await db.commit()

    return BookingStatusRefreshResponse(
        checked=len(bookings),
        payment_expired=payment_expired,
        missed=missed,
        slots_released=slots_released,
        message="Refresh status booking selesai",
    )
