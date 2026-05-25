from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_role
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
    current_user: Pengguna = Depends(require_role("pasien")),
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
    current_user: Pengguna = Depends(require_role("pasien")),
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
async def checkout_booking(
    payload: BookingCheckoutRequest,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Buat booking konsultasi dan transaksi Snap Midtrans dalam satu alur."""
    return await create_booking_checkout(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.get(
    "/me",
    response_model=list[BookingReceiptResponse],
)
async def read_my_bookings(
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Ambil riwayat booking pasien login."""
    return await list_patient_bookings(db=db, current_user=current_user)


@router.patch(
    "/{id_pemesanan_konsultasi}/reschedule",
    response_model=BookingReceiptResponse,
)
async def reschedule_booking(
    id_pemesanan_konsultasi: int,
    payload: BookingRescheduleRequest,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Ubah jadwal booking yang sudah dibayar tanpa membuat transaksi baru."""
    return await reschedule_paid_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
        payload=payload,
    )


@router.post(
    "/{id_pemesanan_konsultasi}/cancel",
    response_model=BookingReceiptResponse,
)
async def cancel_booking(
    id_pemesanan_konsultasi: int,
    payload: BookingCancelRequest,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Batalkan booking pasien. Paid booking tidak membuat refund otomatis."""
    return await cancel_patient_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
        payload=payload,
    )


@router.post(
    "/{id_pemesanan_konsultasi}/reschedule-request",
    response_model=BookingReceiptResponse,
)
async def create_reschedule_request(
    id_pemesanan_konsultasi: int,
    payload: BookingRescheduleRequestCreate,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Ajukan reschedule booking ke psikolog. Pasien belum bisa pilih slot baru sebelum disetujui."""
    return await request_booking_reschedule(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
        payload=payload,
    )


@router.post(
    "/{id_pemesanan_konsultasi}/close-missed",
    response_model=BookingReceiptResponse,
)
async def close_missed_consultation(
    id_pemesanan_konsultasi: int,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Tutup booking yang sudah terlewat sebagai no-show tanpa refund otomatis."""
    return await close_missed_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
    )


@router.post(
    "/reminders/send-due",
    response_model=BookingReminderDispatchResponse,
)
async def send_due_booking_reminders(
    _admin: Pengguna = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Kirim reminder WhatsApp untuk booking yang waktunya sudah jatuh tempo."""
    return await dispatch_due_booking_reminders(db=db)


@router.post(
    "/status/refresh",
    response_model=BookingStatusRefreshResponse,
)
async def refresh_booking_status(
    _admin: Pengguna = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Refresh status booking expired dan terlewat untuk scheduler/cron production."""
    return await refresh_booking_statuses(db=db)
