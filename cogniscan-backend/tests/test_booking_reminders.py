from datetime import datetime, timedelta

import pytest

from api.models.jadwal_psikolog import JadwalPsikolog
from api.models.pasien import Pasien
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.psikolog import Psikolog
from api.models.reminder_konsultasi import ReminderKonsultasi
from api.services import booking_reminder_service


class _ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _FakeDb:
    def __init__(self):
        self.reminders: list[ReminderKonsultasi] = []
        self.commit_count = 0

    async def execute(self, _query):
        return _ScalarResult(self.reminders[0] if self.reminders else None)

    def add(self, reminder):
        self.reminders.append(reminder)

    async def commit(self):
        self.commit_count += 1


def _booking(*, mode: str = "online") -> PemesananKonsultasi:
    start_at = datetime.now(booking_reminder_service.REMINDER_TIMEZONE) + timedelta(
        hours=24
    )
    booking = PemesananKonsultasi(
        id_pemesanan_konsultasi=42,
        status_konsultasi="terkonfirmasi",
        status_pembayaran="dibayar",
        mode_konsultasi=mode,
        link_pertemuan="https://meet.jit.si/cogniscan-demo",
    )
    booking.pasien = Pasien(
        id_pasien=7,
        nama_lengkap="Ayu Lestari",
        no_hp_wa="6281234567890",
    )
    booking.psikolog = Psikolog(
        id_psikolog=3,
        nama_lengkap="dr Tanwirul",
        alamat_praktik="Klinik CogniScan",
    )
    booking.jadwal = JadwalPsikolog(
        id_jadwal_psikolog=9,
        tanggal_praktik=start_at.date(),
        waktu_mulai=start_at.time().replace(second=0, microsecond=0),
    )
    return booking


def test_reminder_due_window_uses_lead_time_with_tolerance():
    now = datetime(2026, 1, 1, 8, 0, tzinfo=booking_reminder_service.REMINDER_TIMEZONE)
    window = booking_reminder_service.ReminderWindow(
        reminder_type="h_minus_2",
        lead_minutes=120,
        tolerance_minutes=15,
        label="sekitar 2 jam lagi",
    )

    assert booking_reminder_service._is_due(now + timedelta(minutes=120), window, now)
    assert booking_reminder_service._is_due(now + timedelta(minutes=105), window, now)
    assert booking_reminder_service._is_due(now + timedelta(minutes=135), window, now)
    assert not booking_reminder_service._is_due(
        now + timedelta(minutes=104),
        window,
        now,
    )
    assert not booking_reminder_service._is_due(
        now + timedelta(minutes=136),
        window,
        now,
    )


def test_reminder_message_contains_consultation_context_for_online_and_offline():
    online_booking = _booking(mode="online")
    online_start = booking_reminder_service._consultation_start(online_booking)
    online_message = booking_reminder_service._booking_message(
        online_booking,
        booking_reminder_service.REMINDER_WINDOWS[0],
        online_start,
    )

    assert "Ayu Lestari" in online_message
    assert "dr Tanwirul" in online_message
    assert "Metode: Online" in online_message
    assert "https://meet.jit.si/cogniscan-demo" in online_message
    assert "dana konsultasi tidak dikembalikan" in online_message

    offline_booking = _booking(mode="offline")
    offline_start = booking_reminder_service._consultation_start(offline_booking)
    offline_message = booking_reminder_service._booking_paid_message(
        offline_booking,
        offline_start,
    )

    assert "Metode: Offline" in offline_message
    assert "Klinik CogniScan" in offline_message


@pytest.mark.asyncio
async def test_booking_paid_confirmation_is_idempotent(monkeypatch):
    sent_messages = []

    async def fake_send_whatsapp_text(phone_number, text):
        sent_messages.append((phone_number, text))

    monkeypatch.setattr(booking_reminder_service, "is_waha_configured", lambda: True)
    monkeypatch.setattr(
        booking_reminder_service,
        "send_whatsapp_text",
        fake_send_whatsapp_text,
    )

    db = _FakeDb()
    booking = _booking()

    assert await booking_reminder_service.dispatch_booking_paid_confirmation(db, booking)
    assert len(sent_messages) == 1
    assert sent_messages[0][0] == "6281234567890"
    assert len(db.reminders) == 1
    assert db.reminders[0].tipe_reminder == booking_reminder_service.BOOKING_PAID_REMINDER_TYPE
    assert db.reminders[0].status == "sent"
    assert db.commit_count == 1

    assert not await booking_reminder_service.dispatch_booking_paid_confirmation(
        db,
        booking,
    )
    assert len(sent_messages) == 1
    assert db.commit_count == 1
