from __future__ import annotations

from secrets import token_urlsafe

from api.core.config import settings
from api.models.pemesanan_konsultasi import PemesananKonsultasi


JITSI_PLATFORM_NAME = "Jitsi"


def _build_jitsi_room_url(booking: PemesananKonsultasi) -> str:
    room_token = token_urlsafe(12)
    room_name = f"cogniscan-{booking.id_pemesanan_konsultasi}-{room_token}"
    return f"{settings.JITSI_BASE_URL.rstrip('/')}/{room_name}"


def ensure_online_meeting_room(booking: PemesananKonsultasi) -> None:
    """Buat link Jitsi sekali saja untuk booking online yang sudah terkonfirmasi."""
    if booking.mode_konsultasi != "online":
        return

    if booking.link_pertemuan and booking.link_pertemuan.strip():
        return

    booking.platform_pertemuan = JITSI_PLATFORM_NAME
    booking.link_pertemuan = _build_jitsi_room_url(booking)
