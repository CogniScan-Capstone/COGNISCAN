from __future__ import annotations

import re

import httpx

from api.core.config import settings


class WahaServiceError(RuntimeError):
    """Error saat backend gagal mengirim pesan lewat WAHA."""


def normalize_whatsapp_chat_id(phone_number: str | None) -> str | None:
    if not phone_number:
        return None

    digits = re.sub(r"\D", "", phone_number)
    if not digits:
        return None

    if digits.startswith("0"):
        digits = f"62{digits[1:]}"

    return f"{digits}@c.us"


def is_waha_configured() -> bool:
    return bool(settings.WAHA_ENABLED and settings.waha_send_text_url)


async def send_whatsapp_text(
    *,
    phone_number: str | None,
    text: str,
) -> dict | None:
    if not is_waha_configured():
        return None

    chat_id = normalize_whatsapp_chat_id(phone_number)
    if not chat_id:
        raise WahaServiceError("Nomor WhatsApp pasien tidak valid atau kosong")

    url = settings.waha_send_text_url
    if not url:
        return None

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    if settings.WAHA_API_KEY:
        headers["X-Api-Key"] = settings.WAHA_API_KEY

    payload = {
        "session": settings.WAHA_SESSION,
        "chatId": chat_id,
        "text": text,
    }

    try:
        async with httpx.AsyncClient(timeout=settings.WAHA_SEND_TIMEOUT_SECONDS) as client:
            response = await client.post(url, json=payload, headers=headers)
    except httpx.RequestError as exc:
        raise WahaServiceError(f"Gagal menghubungi WAHA: {exc}") from exc

    if response.status_code >= 400:
        raise WahaServiceError(
            f"WAHA mengembalikan status {response.status_code}: {response.text[:300]}"
        )

    try:
        return response.json()
    except ValueError:
        return {"status": "sent"}
