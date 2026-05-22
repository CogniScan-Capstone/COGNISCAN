from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_role
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.booking import (
    BookingCheckoutRequest,
    BookingCheckoutResponse,
    BookingReminderDispatchResponse,
    BookingReceiptResponse,
    BookingRescheduleRequest,
)
from api.services.booking_reminder_service import dispatch_due_booking_reminders
from api.services.booking_service import (
    create_booking_checkout,
    list_patient_bookings,
    reschedule_paid_booking,
)

router = APIRouter()


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
    "/reminders/send-due",
    response_model=BookingReminderDispatchResponse,
)
async def send_due_booking_reminders(
    _admin: Pengguna = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Kirim reminder WhatsApp untuk booking yang waktunya sudah jatuh tempo."""
    return await dispatch_due_booking_reminders(db=db)
