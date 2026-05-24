from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


class MidtransPaymentCreateRequest(BaseModel):
    id_pemesanan_konsultasi: int = Field(..., gt=0)


class MidtransPaymentCreateResponse(BaseModel):
    id_pemesanan_konsultasi: int
    id_transaksi_pembayaran: int
    order_id: str
    snap_token: str
    redirect_url: str
    client_key: str
    snap_script_url: str
    jumlah_bayar: Decimal
    status_transaksi: str | None = None


class MidtransNotificationResponse(BaseModel):
    order_id: str | None = None
    transaction_status: str | None = None
    status_transaksi: str | None = None
    message: str


class PaymentReceiptResponse(BaseModel):
    id_pemesanan_konsultasi: int
    id_transaksi_pembayaran: int
    order_id: str | None = None
    nomor_nota: str | None = None
    nama_pasien: str | None = None
    nama_psikolog: str | None = None
    metode_konsultasi: str | None = None
    metode_pembayaran: str | None = None
    jumlah_bayar: Decimal | None = None
    status_transaksi: str | None = None
    status_konsultasi: str | None = None
    status_pembayaran: str | None = None
    link_pertemuan: str | None = None
    platform_pertemuan: str | None = None
    lokasi_konsultasi: str | None = None
    tanggal_konsultasi: date | None = None
    waktu_konsultasi: str | None = None
    tanggal_booking: datetime | None = None
    alasan_pembatalan_pasien: str | None = None
    dibatalkan_pada: datetime | None = None
    waktu_bayar: datetime | None = None
    midtrans_transaction_id: str | None = None
    midtrans_transaction_status: str | None = None
    midtrans_fraud_status: str | None = None


class MidtransWebhookPayload(BaseModel):
    model_config = {"extra": "allow"}

    order_id: str | None = None
    status_code: str | None = None
    gross_amount: str | None = None
    signature_key: str | None = None
    transaction_status: str | None = None
    fraud_status: str | None = None
    transaction_id: str | None = None
    payment_type: str | None = None
    status_message: str | None = None

    def raw_payload(self) -> dict[str, Any]:
        return self.model_dump(mode="json")
