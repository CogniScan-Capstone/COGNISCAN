from datetime import date

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.config import settings
from api.core.rate_limit import limiter
from api.dependencies.auth import get_current_active_pasien, require_role
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.booking import (
    BookingAvailabilitySlotResponse,
    BookingCancelRequest,
    BookingCheckoutRequest,
    BookingCheckoutResponse,
    BookingReminderDispatchResponse,
    BookingReceiptResponse,
    BookingRescheduleRequest,
    BookingRescheduleRequestCreate,
    BookingStatusRefreshResponse,
)
from api.services.booking_reminder_service import dispatch_due_booking_reminders
from api.services.booking_service import (
    cancel_patient_booking,
    close_missed_booking,
    create_booking_checkout,
    list_patient_booking_availability,
    list_patient_bookings,
    list_patient_reschedule_availability,
    refresh_booking_statuses,
    request_booking_reschedule,
    reschedule_paid_booking,
)
from api.services.audit_log_service import record_audit_log

router = APIRouter()


@router.get(
    "/availability",
    response_model=list[BookingAvailabilitySlotResponse],
)
async def read_booking_availability(
    id_pra_asesmen: int | None = Query(default=None, gt=0),
    id_booking_sebelumnya: int | None = Query(default=None, gt=0),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Ambil slot tersedia psikolog untuk feedback final milik pasien."""
    return await list_patient_booking_availability(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
        id_booking_sebelumnya=id_booking_sebelumnya,
        start_date=start_date,
        end_date=end_date,
    )


@router.get(
    "/{id_pemesanan_konsultasi}/availability",
    response_model=list[BookingAvailabilitySlotResponse],
)
async def read_reschedule_availability(
    id_pemesanan_konsultasi: int,
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Ambil slot tersedia untuk reschedule booking pasien yang sudah dibayar."""
    return await list_patient_reschedule_availability(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
        start_date=start_date,
        end_date=end_date,
    )


@router.post(
    "/checkout",
    response_model=BookingCheckoutResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(settings.RATE_LIMIT_PAYMENT_MUTATION)
async def checkout_booking(
    payload: BookingCheckoutRequest,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Buat booking konsultasi dan transaksi Snap Midtrans dalam satu alur."""
    checkout = await create_booking_checkout(
        db=db,
        current_user=current_user,
        payload=payload,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="patient_create_booking_checkout",
        target_type="pemesanan_konsultasi",
        target_id=checkout.id_pemesanan_konsultasi,
        request=request,
        metadata={
            "id_pra_asesmen": checkout.id_pra_asesmen,
            "id_booking_sebelumnya": checkout.id_booking_sebelumnya,
            "mode_konsultasi": checkout.mode_konsultasi,
            "status_pembayaran": checkout.status_pembayaran,
            "status_konsultasi": checkout.status_konsultasi,
        },
        commit=True,
    )
    return checkout


@router.get(
    "/me",
    response_model=list[BookingReceiptResponse],
)
async def read_my_bookings(
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Ambil riwayat booking pasien login."""
    return await list_patient_bookings(db=db, current_user=current_user)


@router.patch(
    "/{id_pemesanan_konsultasi}/reschedule",
    response_model=BookingReceiptResponse,
)
@limiter.limit(settings.RATE_LIMIT_SCHEDULE_MUTATION)
async def reschedule_booking(
    id_pemesanan_konsultasi: int,
    payload: BookingRescheduleRequest,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Ubah jadwal booking yang sudah dibayar tanpa membuat transaksi baru."""
    booking = await reschedule_paid_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
        payload=payload,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="patient_reschedule_paid_booking",
        target_type="pemesanan_konsultasi",
        target_id=id_pemesanan_konsultasi,
        request=request,
        metadata={
            "tanggal_konsultasi": booking.tanggal_konsultasi,
            "waktu_konsultasi": booking.waktu_konsultasi,
            "mode_konsultasi": booking.mode_konsultasi,
        },
        commit=True,
    )
    return booking


@router.post(
    "/{id_pemesanan_konsultasi}/cancel",
    response_model=BookingReceiptResponse,
)
@limiter.limit(settings.RATE_LIMIT_PAYMENT_MUTATION)
async def cancel_booking(
    id_pemesanan_konsultasi: int,
    payload: BookingCancelRequest,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Batalkan booking pasien. Paid booking tidak membuat refund otomatis."""
    booking = await cancel_patient_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
        payload=payload,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="patient_cancel_booking",
        target_type="pemesanan_konsultasi",
        target_id=id_pemesanan_konsultasi,
        request=request,
        metadata={
            "status_pembayaran": booking.status_pembayaran,
            "status_konsultasi": booking.status_konsultasi,
            "has_reason": bool(payload.alasan_pasien),
        },
        commit=True,
    )
    return booking


@router.post(
    "/{id_pemesanan_konsultasi}/reschedule-request",
    response_model=BookingReceiptResponse,
)
@limiter.limit(settings.RATE_LIMIT_SCHEDULE_MUTATION)
async def create_reschedule_request(
    id_pemesanan_konsultasi: int,
    payload: BookingRescheduleRequestCreate,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Ajukan reschedule booking ke psikolog. Pasien belum bisa pilih slot baru sebelum disetujui."""
    booking = await request_booking_reschedule(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
        payload=payload,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="patient_request_booking_reschedule",
        target_type="pemesanan_konsultasi",
        target_id=id_pemesanan_konsultasi,
        request=request,
        metadata={"alasan_length": len(payload.alasan_pasien.strip())},
        commit=True,
    )
    return booking


@router.post(
    "/{id_pemesanan_konsultasi}/close-missed",
    response_model=BookingReceiptResponse,
)
@limiter.limit(settings.RATE_LIMIT_PAYMENT_MUTATION)
async def close_missed_consultation(
    id_pemesanan_konsultasi: int,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Tutup booking yang sudah terlewat sebagai no-show tanpa refund otomatis."""
    booking = await close_missed_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="patient_close_missed_booking",
        target_type="pemesanan_konsultasi",
        target_id=id_pemesanan_konsultasi,
        request=request,
        metadata={
            "status_pembayaran": booking.status_pembayaran,
            "status_konsultasi": booking.status_konsultasi,
        },
        commit=True,
    )
    return booking


@router.post(
    "/reminders/send-due",
    response_model=BookingReminderDispatchResponse,
)
@limiter.limit(settings.RATE_LIMIT_REMINDER_DISPATCH)
async def send_due_booking_reminders(
    request: Request,
    current_admin: Pengguna = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Kirim reminder WhatsApp untuk booking yang waktunya sudah jatuh tempo."""
    result = await dispatch_due_booking_reminders(db=db)
    await record_audit_log(
        db,
        actor=current_admin,
        action="admin_dispatch_due_booking_reminders",
        target_type="booking_reminder",
        request=request,
        metadata={
            "checked": result.checked,
            "sent": result.sent,
            "skipped": result.skipped,
            "failed": result.failed,
        },
        commit=True,
    )
    return result


@router.post(
    "/status/refresh",
    response_model=BookingStatusRefreshResponse,
)
@limiter.limit(settings.RATE_LIMIT_ADMIN_ACTION)
async def refresh_booking_status(
    request: Request,
    current_admin: Pengguna = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Refresh status booking expired dan terlewat untuk scheduler/cron production."""
    result = await refresh_booking_statuses(db=db)
    await record_audit_log(
        db,
        actor=current_admin,
        action="admin_refresh_booking_statuses",
        target_type="pemesanan_konsultasi",
        request=request,
        metadata={
            "checked": result.checked,
            "payment_expired": result.payment_expired,
            "missed": result.missed,
            "slots_released": result.slots_released,
        },
        commit=True,
    )
    return result
