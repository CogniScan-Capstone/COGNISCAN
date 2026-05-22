from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.reminder_konsultasi import ReminderKonsultasi
from api.schemas.booking import BookingReminderDispatchResponse
from api.services.whatsapp_service import (
    WahaServiceError,
    is_waha_configured,
    send_whatsapp_text,
)


REMINDER_TIMEZONE = ZoneInfo("Asia/Jakarta")
WHATSAPP_CHANNEL = "whatsapp"


@dataclass(frozen=True)
class ReminderWindow:
    reminder_type: str
    lead_minutes: int
    tolerance_minutes: int
    label: str


REMINDER_WINDOWS = (
    ReminderWindow("h_minus_24", 24 * 60, 20, "besok"),
    ReminderWindow("h_minus_2", 2 * 60, 15, "sekitar 2 jam lagi"),
)


def _consultation_start(booking: PemesananKonsultasi) -> datetime | None:
    if not booking.jadwal or not booking.jadwal.tanggal_praktik or not booking.jadwal.waktu_mulai:
        return None

    return datetime.combine(
        booking.jadwal.tanggal_praktik,
        booking.jadwal.waktu_mulai,
    ).replace(tzinfo=REMINDER_TIMEZONE)


def _is_due(start_at: datetime, window: ReminderWindow, now: datetime) -> bool:
    minutes_until = (start_at - now).total_seconds() / 60
    lower = window.lead_minutes - window.tolerance_minutes
    upper = window.lead_minutes + window.tolerance_minutes
    return lower <= minutes_until <= upper


def _format_consultation_date(start_at: datetime) -> str:
    return start_at.strftime("%d/%m/%Y pukul %H:%M")


def _booking_message(
    booking: PemesananKonsultasi,
    window: ReminderWindow,
    start_at: datetime,
) -> str:
    patient_name = booking.pasien.nama_lengkap if booking.pasien else "Pasien CogniScan"
    psikolog_name = booking.psikolog.nama_lengkap if booking.psikolog else "Psikolog CogniScan"
    method = "online" if booking.mode_konsultasi == "online" else "offline"

    location_line = ""
    if method == "online" and booking.link_pertemuan:
        location_line = f"\nLink konsultasi: {booking.link_pertemuan}"
    elif method == "offline" and booking.psikolog and booking.psikolog.alamat_praktik:
        location_line = f"\nLokasi: {booking.psikolog.alamat_praktik}"

    return (
        f"Halo {patient_name}, ini reminder konsultasi CogniScan {window.label}.\n\n"
        f"Psikolog: {psikolog_name}\n"
        f"Jadwal: {_format_consultation_date(start_at)}\n"
        f"Metode: {method.capitalize()}"
        f"{location_line}\n\n"
        "Catatan: dana konsultasi tidak dikembalikan jika pasien tidak hadir. "
        "Reschedule hanya berlaku jika disetujui psikolog."
    )


async def _get_reminder_log(
    db: AsyncSession,
    booking: PemesananKonsultasi,
    reminder_type: str,
) -> ReminderKonsultasi | None:
    result = await db.execute(
        select(ReminderKonsultasi).where(
            ReminderKonsultasi.id_pemesanan_konsultasi == booking.id_pemesanan_konsultasi,
            ReminderKonsultasi.tipe_reminder == reminder_type,
            ReminderKonsultasi.channel == WHATSAPP_CHANNEL,
        )
    )
    return result.scalar_one_or_none()


async def _mark_reminder(
    db: AsyncSession,
    booking: PemesananKonsultasi,
    reminder_type: str,
    status: str,
    error_message: str | None = None,
) -> None:
    reminder = await _get_reminder_log(db, booking, reminder_type)
    if reminder is None:
        reminder = ReminderKonsultasi(
            id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
            tipe_reminder=reminder_type,
            channel=WHATSAPP_CHANNEL,
        )
        db.add(reminder)

    reminder.status = status
    reminder.error_message = error_message
    if status == "sent":
        reminder.dikirim_pada = datetime.now(timezone.utc)


async def _already_sent(
    db: AsyncSession,
    booking: PemesananKonsultasi,
    reminder_type: str,
) -> bool:
    reminder = await _get_reminder_log(db, booking, reminder_type)
    return reminder is not None and reminder.status == "sent"


async def dispatch_due_booking_reminders(
    db: AsyncSession,
) -> BookingReminderDispatchResponse:
    if not is_waha_configured():
        return BookingReminderDispatchResponse(
            checked=0,
            sent=0,
            skipped=0,
            failed=0,
            message="WAHA belum aktif atau WAHA_BASE_URL belum diisi",
        )

    now = datetime.now(REMINDER_TIMEZONE)
    result = await db.execute(
        select(PemesananKonsultasi)
        .where(
            PemesananKonsultasi.status_pembayaran == "dibayar",
            PemesananKonsultasi.status_konsultasi == "terkonfirmasi",
        )
        .options(
            selectinload(PemesananKonsultasi.pasien),
            selectinload(PemesananKonsultasi.psikolog),
            selectinload(PemesananKonsultasi.jadwal),
        )
    )
    bookings = list(result.scalars().all())

    checked = 0
    sent = 0
    skipped = 0
    failed = 0

    for booking in bookings:
        start_at = _consultation_start(booking)
        if start_at is None:
            skipped += 1
            continue

        for window in REMINDER_WINDOWS:
            if not _is_due(start_at, window, now):
                continue

            checked += 1
            if await _already_sent(db, booking, window.reminder_type):
                skipped += 1
                continue

            try:
                await send_whatsapp_text(
                    phone_number=booking.pasien.no_hp_wa if booking.pasien else None,
                    text=_booking_message(booking, window, start_at),
                )
                await _mark_reminder(db, booking, window.reminder_type, "sent")
                sent += 1
            except WahaServiceError as exc:
                await _mark_reminder(db, booking, window.reminder_type, "failed", str(exc))
                failed += 1

    await db.commit()
    return BookingReminderDispatchResponse(
        checked=checked,
        sent=sent,
        skipped=skipped,
        failed=failed,
        message="Reminder WhatsApp jatuh tempo selesai diproses",
    )
