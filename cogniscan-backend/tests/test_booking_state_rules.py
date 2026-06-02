from datetime import datetime, time, timedelta, timezone

import pytest
from fastapi import HTTPException

from api.models.hasil_konsultasi import HasilKonsultasi
from api.models.jadwal_psikolog import JadwalPsikolog
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.transaksi_pembayaran import TransaksiPembayaran
from api.services import booking_service


def _time_without_seconds(value: datetime) -> time:
    return value.time().replace(second=0, microsecond=0)


def _slot(*, starts_in_minutes: int, duration_minutes: int = 60, available: bool = False):
    start_at = datetime.now(booking_service.BOOKING_TIMEZONE) + timedelta(
        minutes=starts_in_minutes
    )
    end_at = start_at + timedelta(minutes=duration_minutes)
    return JadwalPsikolog(
        id_jadwal_psikolog=1,
        tanggal_praktik=start_at.date(),
        waktu_mulai=_time_without_seconds(start_at),
        waktu_selesai=_time_without_seconds(end_at),
        apakah_tersedia=available,
    )


def _booking(
    *,
    status_konsultasi: str = "terkonfirmasi",
    status_pembayaran: str = "dibayar",
    transaction_status: str | None = "berhasil",
    jadwal: JadwalPsikolog | None = None,
    payment_deadline: datetime | None = None,
) -> PemesananKonsultasi:
    booking = PemesananKonsultasi(
        id_pemesanan_konsultasi=1,
        status_konsultasi=status_konsultasi,
        status_pembayaran=status_pembayaran,
        tanggal_booking=datetime.now(timezone.utc),
    )
    booking.jadwal = jadwal
    if transaction_status is not None:
        booking.transaksi_pembayaran = TransaksiPembayaran(
            id_transaksi_pembayaran=1,
            status_transaksi=transaction_status,
            batas_waktu_bayar=payment_deadline,
        )
    return booking


def test_schedule_validation_rejects_past_datetime_and_allows_future_datetime():
    past = datetime.now(booking_service.BOOKING_TIMEZONE) - timedelta(minutes=1)
    future = datetime.now(booking_service.BOOKING_TIMEZONE) + timedelta(days=1)

    with pytest.raises(HTTPException) as exc_info:
        booking_service._ensure_schedule_not_in_past(
            past.date(),
            _time_without_seconds(past),
        )

    assert exc_info.value.status_code == 400
    assert "tidak boleh" in exc_info.value.detail

    booking_service._ensure_schedule_not_in_past(
        future.date(),
        _time_without_seconds(future),
    )


@pytest.mark.parametrize(
    ("status_pembayaran", "status_konsultasi", "transaction_status", "expected"),
    [
        ("dibayar", "menunggu_pembayaran", "menunggu", True),
        ("belum_bayar", "terkonfirmasi", "menunggu", True),
        ("belum_bayar", "menunggu_pembayaran", "berhasil", True),
        ("belum_bayar", "menunggu_pembayaran", "menunggu", False),
    ],
)
def test_paid_booking_predicate_accepts_backend_and_midtrans_paid_states(
    status_pembayaran,
    status_konsultasi,
    transaction_status,
    expected,
):
    booking = _booking(
        status_pembayaran=status_pembayaran,
        status_konsultasi=status_konsultasi,
        transaction_status=transaction_status,
    )

    assert booking_service._is_paid_booking(booking) is expected


def test_refresh_missed_booking_supports_paid_legacy_waiting_payment_state():
    booking = _booking(
        status_konsultasi="menunggu_pembayaran",
        status_pembayaran="dibayar",
        transaction_status="berhasil",
        jadwal=_slot(starts_in_minutes=-120),
    )

    assert booking_service.refresh_consultation_status_if_missed(booking) is True
    assert booking.status_konsultasi == "menunggu_konfirmasi_psikolog"


def test_refresh_missed_booking_ignores_unpaid_or_future_bookings():
    unpaid = _booking(
        status_konsultasi="menunggu_pembayaran",
        status_pembayaran="belum_bayar",
        transaction_status="menunggu",
        jadwal=_slot(starts_in_minutes=-120),
    )
    future = _booking(
        status_konsultasi="terkonfirmasi",
        status_pembayaran="dibayar",
        transaction_status="berhasil",
        jadwal=_slot(starts_in_minutes=120),
    )

    assert booking_service.refresh_consultation_status_if_missed(unpaid) is False
    assert unpaid.status_konsultasi == "menunggu_pembayaran"

    assert booking_service.refresh_consultation_status_if_missed(future) is False
    assert future.status_konsultasi == "terkonfirmasi"


def test_expire_pending_payment_marks_payment_expired_and_releases_slot():
    booking = _booking(
        status_konsultasi="menunggu_pembayaran",
        status_pembayaran="belum_bayar",
        transaction_status="menunggu",
        jadwal=_slot(starts_in_minutes=120, available=False),
        payment_deadline=datetime.now(timezone.utc) - timedelta(minutes=1),
    )

    expired, released = booking_service._expire_pending_payment_if_due(booking)

    assert expired is True
    assert released is True
    assert booking.status_pembayaran == "kedaluwarsa"
    assert booking.status_konsultasi == "payment_kedaluwarsa"
    assert booking.transaksi_pembayaran.status_transaksi == "kedaluwarsa"
    assert booking.jadwal.apakah_tersedia is True


def test_expire_pending_payment_keeps_non_due_booking_unchanged():
    booking = _booking(
        status_konsultasi="menunggu_pembayaran",
        status_pembayaran="belum_bayar",
        transaction_status="menunggu",
        jadwal=_slot(starts_in_minutes=120, available=False),
        payment_deadline=datetime.now(timezone.utc) + timedelta(hours=1),
    )

    expired, released = booking_service._expire_pending_payment_if_due(booking)

    assert expired is False
    assert released is False
    assert booking.status_pembayaran == "belum_bayar"
    assert booking.status_konsultasi == "menunggu_pembayaran"
    assert booking.jadwal.apakah_tersedia is False


def test_release_booking_slot_only_future_prevents_releasing_past_slot():
    past_booking = _booking(jadwal=_slot(starts_in_minutes=-120, available=False))
    future_booking = _booking(jadwal=_slot(starts_in_minutes=120, available=False))

    assert booking_service._release_booking_slot(past_booking, only_future=True) is False
    assert past_booking.jadwal.apakah_tersedia is False

    assert booking_service._release_booking_slot(future_booking, only_future=True) is True
    assert future_booking.jadwal.apakah_tersedia is True


@pytest.mark.parametrize(
    ("status_pembayaran", "status_konsultasi", "transaction_status", "expected"),
    [
        ("kedaluwarsa", "payment_kedaluwarsa", "kedaluwarsa", True),
        ("belum_bayar", "dibatalkan_pasien", "menunggu", True),
        ("belum_bayar", "menunggu_pembayaran", "gagal", True),
        ("dibayar", "terkonfirmasi", "berhasil", False),
    ],
)
def test_rebookable_booking_predicate_only_allows_final_or_failed_payment_states(
    status_pembayaran,
    status_konsultasi,
    transaction_status,
    expected,
):
    booking = _booking(
        status_pembayaran=status_pembayaran,
        status_konsultasi=status_konsultasi,
        transaction_status=transaction_status,
    )

    assert booking_service._is_rebookable_booking(booking) is expected


def test_patient_booking_receipt_does_not_expose_internal_clinical_notes():
    booking = _booking(
        jadwal=_slot(starts_in_minutes=-120),
        status_konsultasi="selesai",
    )
    booking.hasil_konsultasi = HasilKonsultasi(
        id_hasil_konsultasi=1,
        id_pemesanan_konsultasi=1,
        pasien_hadir=True,
        ringkasan_untuk_pasien="Ringkasan yang boleh dibaca pasien.",
        rekomendasi_tindak_lanjut="Rekomendasi aman untuk pasien.",
        catatan_internal="Catatan internal psikolog.",
        asesmen_klinis="Asesmen klinis internal.",
        tingkat_risiko="rendah",
    )

    response = booking_service._receipt_response(booking)

    assert response.hasil_konsultasi_ringkasan == "Ringkasan yang boleh dibaca pasien."
    assert response.hasil_konsultasi_rekomendasi == "Rekomendasi aman untuk pasien."
    assert not hasattr(response, "catatan_internal")
    assert not hasattr(response, "asesmen_klinis")
    assert not hasattr(response, "tingkat_risiko")
