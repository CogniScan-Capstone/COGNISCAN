from __future__ import annotations

import base64
import hashlib
from decimal import Decimal
from typing import Any

import httpx

from api.core.config import settings


class MidtransServiceError(RuntimeError):
    """Error integrasi Midtrans yang aman untuk dikonversi menjadi HTTP error."""


def _authorization_header() -> str:
    environment_error = settings.midtrans_environment_error
    if environment_error:
        raise MidtransServiceError(environment_error)

    token = base64.b64encode(f"{settings.MIDTRANS_SERVER_KEY}:".encode("utf-8")).decode("ascii")
    return f"Basic {token}"


def verify_midtrans_signature(
    *,
    order_id: str | None,
    status_code: str | None,
    gross_amount: str | None,
    signature_key: str | None,
) -> bool:
    if not all([order_id, status_code, gross_amount, signature_key, settings.MIDTRANS_SERVER_KEY]):
        return False

    raw = f"{order_id}{status_code}{gross_amount}{settings.MIDTRANS_SERVER_KEY}"
    expected = hashlib.sha512(raw.encode("utf-8")).hexdigest()
    return expected == signature_key


def map_midtrans_status(transaction_status: str | None, fraud_status: str | None = None) -> str:
    status = (transaction_status or "").lower()
    fraud = (fraud_status or "").lower()

    if status == "settlement":
        return "berhasil"
    if status == "capture":
        return "berhasil" if fraud in {"", "accept"} else "menunggu"
    if status == "pending":
        return "menunggu"
    if status in {"deny", "failure"}:
        return "gagal"
    if status == "expire":
        return "kedaluwarsa"
    if status == "cancel":
        return "dibatalkan"
    if status in {"refund", "partial_refund"}:
        return "dibatalkan"

    return "proses"


async def create_snap_transaction(
    *,
    order_id: str,
    gross_amount: Decimal,
    customer_name: str,
    customer_email: str,
    customer_phone: str | None,
    item_name: str,
) -> dict[str, Any]:
    environment_error = settings.midtrans_environment_error
    if environment_error:
        raise MidtransServiceError(environment_error)

    amount = int(gross_amount)
    payload: dict[str, Any] = {
        "transaction_details": {
            "order_id": order_id,
            "gross_amount": amount,
        },
        "item_details": [
            {
                "id": order_id,
                "price": amount,
                "quantity": 1,
                "name": item_name[:50],
            }
        ],
        "customer_details": {
            "first_name": customer_name[:255],
            "email": customer_email,
        },
        "callbacks": {
            "finish": f"{settings.MIDTRANS_FINISH_URL}?order_id={order_id}",
        },
    }

    if customer_phone:
        payload["customer_details"]["phone"] = customer_phone

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(
            settings.midtrans_snap_transactions_url,
            headers={
                "Accept": "application/json",
                "Authorization": _authorization_header(),
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if response.status_code >= 400:
        detail = response.text[:500]
        raise MidtransServiceError(f"Midtrans menolak transaksi Snap: {detail}")

    data = response.json()
    if not data.get("token") or not data.get("redirect_url"):
        raise MidtransServiceError("Response Midtrans tidak berisi token atau redirect_url")

    return data


async def get_midtrans_transaction_status(order_id: str) -> dict[str, Any] | None:
    """Ambil status detail transaksi langsung dari API Midtrans."""
    environment_error = settings.midtrans_environment_error
    if environment_error:
        raise MidtransServiceError(environment_error)

    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            response = await client.get(
                f"{settings.MIDTRANS_API_BASE_URL.rstrip('/')}/v2/{order_id}/status",
                headers={
                    "Accept": "application/json",
                    "Authorization": _authorization_header(),
                },
            )
            if response.status_code >= 400:
                return None
            return response.json()
        except Exception:
            return None
