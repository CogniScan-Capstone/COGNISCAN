from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import get_current_active_pasien
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.pembayaran import (
    MidtransNotificationResponse,
    MidtransPaymentCreateRequest,
    MidtransPaymentCreateResponse,
    MidtransWebhookPayload,
    PaymentReceiptResponse,
)
from api.services.pembayaran_service import (
    create_midtrans_payment_for_booking,
    get_payment_receipt_by_order_id,
    process_midtrans_notification,
)

router = APIRouter()


@router.post(
    "/midtrans/create",
    response_model=MidtransPaymentCreateResponse,
)
async def create_midtrans_payment(
    payload: MidtransPaymentCreateRequest,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Buat transaksi Snap Midtrans untuk booking milik pasien login."""
    return await create_midtrans_payment_for_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=payload.id_pemesanan_konsultasi,
    )


@router.post(
    "/midtrans/notification",
    response_model=MidtransNotificationResponse,
)
async def receive_midtrans_notification(
    payload: MidtransWebhookPayload,
    db: AsyncSession = Depends(get_db),
):
    """
    Webhook/notification dari Midtrans.

    Endpoint ini sengaja tidak memakai auth user karena dipanggil server
    Midtrans. Keamanan divalidasi lewat `signature_key`.
    """
    transaction, internal_status = await process_midtrans_notification(
        db=db,
        payload=payload.raw_payload(),
    )
    return MidtransNotificationResponse(
        order_id=transaction.midtrans_order_id,
        transaction_status=transaction.midtrans_transaction_status,
        status_transaksi=internal_status,
        message="Notifikasi Midtrans diproses",
    )


@router.get(
    "/orders/{order_id}",
    response_model=PaymentReceiptResponse,
)
async def read_payment_receipt(
    order_id: str,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Ambil receipt pembayaran berdasarkan Midtrans order_id."""
    return await get_payment_receipt_by_order_id(
        db=db,
        current_user=current_user,
        order_id=order_id,
    )
