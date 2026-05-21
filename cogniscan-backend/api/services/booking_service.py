from __future__ import annotations

from datetime import date as date_type
from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.jadwal_psikolog import JadwalPsikolog
from api.models.pasien import Pasien
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.pengguna import Pengguna
from api.models.pra_asesmen import PraAsesmen
from api.models.psikolog import Psikolog
from api.models.sesi_jurnal import SesiJurnal
from api.schemas.booking import (
    BookingCheckoutRequest,
    BookingCheckoutResponse,
    BookingReceiptResponse,
)
from api.services.pembayaran_service import (
    create_midtrans_payment_for_booking,
    sync_payment_status_if_needed,
)
from api.services.meeting_service import JITSI_PLATFORM_NAME


DEFAULT_CONSULTATION_FEE = Decimal("150000")
CONSULTATION_DURATION_MINUTES = 60
REBOOKABLE_PAYMENT_STATUSES = {"gagal", "kedaluwarsa", "dibatalkan"}
BOOKING_TIMEZONE = ZoneInfo("Asia/Jakarta")


def _as_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _slot_end_time(tanggal: date_type, start_time):
    start = datetime.combine(tanggal, start_time)
    return (start + timedelta(minutes=CONSULTATION_DURATION_MINUTES)).time()


def _display_time(value) -> str:
    return value.isoformat(timespec="minutes") if value else "-"


def _booking_fee(psikolog: Psikolog | None) -> Decimal:
    amount = _as_decimal(psikolog.tarif_konsultasi if psikolog else None)
    return amount if amount > 0 else DEFAULT_CONSULTATION_FEE


def _ensure_schedule_not_in_past(payload: BookingCheckoutRequest) -> None:
    requested_start = datetime.combine(
        payload.tanggal_konsultasi,
        payload.waktu_konsultasi,
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


async def _get_or_create_slot(
    db: AsyncSession,
    pra_asesmen: PraAsesmen,
    payload: BookingCheckoutRequest,
) -> JadwalPsikolog:
    result = await db.execute(
        select(JadwalPsikolog)
        .where(
            JadwalPsikolog.id_psikolog == pra_asesmen.id_psikolog,
            JadwalPsikolog.tanggal_praktik == payload.tanggal_konsultasi,
            JadwalPsikolog.waktu_mulai == payload.waktu_konsultasi,
        )
        .limit(1)
    )
    slot = result.scalars().first()

    if slot is not None:
        if slot.apakah_tersedia is False:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slot jadwal ini sudah tidak tersedia",
            )
        return slot

    slot = JadwalPsikolog(
        id_psikolog=pra_asesmen.id_psikolog,
        tanggal_praktik=payload.tanggal_konsultasi,
        waktu_mulai=payload.waktu_konsultasi,
        waktu_selesai=_slot_end_time(payload.tanggal_konsultasi, payload.waktu_konsultasi),
        apakah_tersedia=True,
    )
    db.add(slot)
    await db.flush()
    return slot


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


async def create_booking_checkout(
    db: AsyncSession,
    current_user: Pengguna,
    payload: BookingCheckoutRequest,
) -> BookingCheckoutResponse:
    _ensure_schedule_not_in_past(payload)

    patient = await _get_patient(db=db, current_user=current_user)
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
    slot = await _get_or_create_slot(db=db, pra_asesmen=pra_asesmen, payload=payload)

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


def _receipt_response(booking: PemesananKonsultasi) -> BookingReceiptResponse:
    transaction = booking.transaksi_pembayaran
    return BookingReceiptResponse(
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        id_pra_asesmen=booking.id_pra_asesmen,
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
            selectinload(PemesananKonsultasi.psikolog),
            selectinload(PemesananKonsultasi.jadwal),
            selectinload(PemesananKonsultasi.transaksi_pembayaran),
        )
        .order_by(PemesananKonsultasi.tanggal_booking.desc())
    )
    bookings = list(result.scalars().all())

    for booking in bookings:
        if booking.transaksi_pembayaran is not None:
            await sync_payment_status_if_needed(db, booking.transaksi_pembayaran)

    return [_receipt_response(booking) for booking in bookings]
