from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.config import settings
from api.core.rate_limit import limiter
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
from api.services.audit_log_service import record_audit_log

router = APIRouter()


@router.post(
    "/midtrans/create",
    response_model=MidtransPaymentCreateResponse,
)
@limiter.limit(settings.RATE_LIMIT_PAYMENT_MUTATION)
async def create_midtrans_payment(
    payload: MidtransPaymentCreateRequest,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Buat transaksi Snap Midtrans untuk booking milik pasien login."""
    payment = await create_midtrans_payment_for_booking(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=payload.id_pemesanan_konsultasi,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="patient_create_midtrans_payment",
        target_type="pemesanan_konsultasi",
        target_id=payload.id_pemesanan_konsultasi,
        request=request,
        metadata={
            "id_transaksi_pembayaran": payment.id_transaksi_pembayaran,
            "order_id": payment.order_id,
            "status_transaksi": payment.status_transaksi,
        },
        commit=True,
    )
    return payment


@router.post(
    "/midtrans/notification",
    response_model=MidtransNotificationResponse,
)
async def receive_midtrans_notification(
    payload: MidtransWebhookPayload,
    request: Request,
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
    await record_audit_log(
        db,
        action="midtrans_webhook_processed",
        target_type="transaksi_pembayaran",
        target_id=transaction.id_transaksi_pembayaran,
        request=request,
        metadata={
            "order_id": transaction.midtrans_order_id,
            "transaction_status": transaction.midtrans_transaction_status,
            "status_transaksi": internal_status,
            "id_pemesanan_konsultasi": transaction.id_pemesanan_konsultasi,
        },
        commit=True,
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
@limiter.limit(settings.RATE_LIMIT_PAYMENT_READ)
async def read_payment_receipt(
    order_id: str,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Ambil receipt pembayaran berdasarkan Midtrans order_id."""
    receipt = await get_payment_receipt_by_order_id(
        db=db,
        current_user=current_user,
        order_id=order_id,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="patient_view_payment_receipt",
        target_type="pemesanan_konsultasi",
        target_id=receipt.id_pemesanan_konsultasi,
        request=request,
        metadata={
            "order_id": receipt.order_id,
            "status_transaksi": receipt.status_transaksi,
            "status_pembayaran": receipt.status_pembayaran,
            "status_konsultasi": receipt.status_konsultasi,
        },
        commit=True,
    )
    return receipt
