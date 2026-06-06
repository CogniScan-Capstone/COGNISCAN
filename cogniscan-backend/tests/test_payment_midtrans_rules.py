from datetime import date, time
from decimal import Decimal

import pytest
from fastapi import HTTPException

from api.models.jadwal_psikolog import JadwalPsikolog
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.transaksi_pembayaran import TransaksiPembayaran
from api.services import pembayaran_service
from api.services.midtrans_service import map_midtrans_status


class _ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class _FakeDb:
    def __init__(self, transaction):
        self.transaction = transaction
        self.commits = 0
        self.refreshed = []

    async def execute(self, _query):
        return _ScalarResult(self.transaction)

    async def commit(self):
        self.commits += 1

    async def refresh(self, obj):
        self.refreshed.append(obj)


def _booking_with_transaction() -> tuple[PemesananKonsultasi, TransaksiPembayaran]:
    booking = PemesananKonsultasi(
        id_pemesanan_konsultasi=12,
        mode_konsultasi="online",
        status_konsultasi="menunggu_pembayaran",
        status_pembayaran="belum_bayar",
        total_biaya=Decimal("150000"),
    )
    booking.jadwal = JadwalPsikolog(
        id_jadwal_psikolog=34,
        tanggal_praktik=date(2026, 6, 10),
        waktu_mulai=time(10, 0),
        waktu_selesai=time(11, 0),
        apakah_tersedia=True,
    )
    transaction = TransaksiPembayaran(
        id_transaksi_pembayaran=56,
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        midtrans_order_id="CGS-TEST-000056",
        jumlah_bayar=Decimal("150000"),
        status_transaksi="menunggu",
    )
    transaction.pemesanan = booking
    booking.transaksi_pembayaran = transaction
    return booking, transaction


@pytest.mark.parametrize(
    ("transaction_status", "fraud_status", "expected"),
    [
        ("settlement", None, "berhasil"),
        ("capture", "accept", "berhasil"),
        ("capture", "challenge", "menunggu"),
        ("pending", None, "menunggu"),
        ("deny", None, "gagal"),
        ("failure", None, "gagal"),
        ("expire", None, "kedaluwarsa"),
        ("cancel", None, "dibatalkan"),
        ("refund", None, "dibatalkan"),
        ("unknown", None, "proses"),
    ],
)
def test_midtrans_status_mapping_is_stable(transaction_status, fraud_status, expected):
    assert map_midtrans_status(transaction_status, fraud_status) == expected


@pytest.mark.asyncio
async def test_midtrans_webhook_settlement_confirms_booking_and_locks_slot(monkeypatch):
    booking, transaction = _booking_with_transaction()
    db = _FakeDb(transaction)
    sent_confirmations = []

    monkeypatch.setattr(
        pembayaran_service,
        "verify_midtrans_signature",
        lambda **_kwargs: True,
    )

    async def fake_send_confirmation(_db, booking_id):
        sent_confirmations.append(booking_id)

    monkeypatch.setattr(
        pembayaran_service,
        "_send_paid_confirmation_if_possible",
        fake_send_confirmation,
    )

    updated_transaction, internal_status = await pembayaran_service.process_midtrans_notification(
        db,
        {
            "order_id": transaction.midtrans_order_id,
            "status_code": "200",
            "gross_amount": "150000.00",
            "signature_key": "valid",
            "transaction_id": "midtrans-123",
            "transaction_status": "settlement",
            "payment_type": "bank_transfer",
            "fraud_status": "accept",
            "status_message": "Success",
        },
    )

    assert updated_transaction is transaction
    assert internal_status == "berhasil"
    assert transaction.status_transaksi == "berhasil"
    assert transaction.midtrans_transaction_id == "midtrans-123"
    assert transaction.metode_pembayaran == "bank_transfer"
    assert booking.status_pembayaran == "dibayar"
    assert booking.status_konsultasi == "terkonfirmasi"
    assert booking.jadwal.apakah_tersedia is False
    assert booking.platform_pertemuan == "Jitsi"
    assert booking.link_pertemuan
    assert db.commits == 1
    assert db.refreshed == [transaction]
    assert sent_confirmations == [booking.id_pemesanan_konsultasi]


@pytest.mark.parametrize(
    ("transaction_status", "expected_internal", "expected_payment", "expected_consultation"),
    [
        ("pending", "menunggu", "belum_bayar", "menunggu_pembayaran"),
        ("expire", "kedaluwarsa", "kedaluwarsa", "payment_kedaluwarsa"),
        ("cancel", "dibatalkan", "dibatalkan", "dibatalkan"),
        ("failure", "gagal", "gagal", "menunggu_pembayaran"),
    ],
)
@pytest.mark.asyncio
async def test_midtrans_webhook_updates_unpaid_terminal_states(
    monkeypatch,
    transaction_status,
    expected_internal,
    expected_payment,
    expected_consultation,
):
    booking, transaction = _booking_with_transaction()
    booking.jadwal.apakah_tersedia = False
    db = _FakeDb(transaction)

    monkeypatch.setattr(
        pembayaran_service,
        "verify_midtrans_signature",
        lambda **_kwargs: True,
    )
    async def fake_send_confirmation(*_args, **_kwargs):
        return None

    monkeypatch.setattr(
        pembayaran_service,
        "_send_paid_confirmation_if_possible",
        fake_send_confirmation,
    )

    _transaction, internal_status = await pembayaran_service.process_midtrans_notification(
        db,
        {
            "order_id": transaction.midtrans_order_id,
            "status_code": "200",
            "gross_amount": "150000.00",
            "signature_key": "valid",
            "transaction_status": transaction_status,
            "payment_type": "bank_transfer",
        },
    )

    assert internal_status == expected_internal
    assert booking.status_pembayaran == expected_payment
    assert booking.status_konsultasi == expected_consultation
    if expected_payment in {"kedaluwarsa", "dibatalkan", "gagal"}:
        assert booking.jadwal.apakah_tersedia is True


@pytest.mark.asyncio
async def test_midtrans_webhook_rejects_invalid_signature(monkeypatch):
    _booking, transaction = _booking_with_transaction()
    db = _FakeDb(transaction)

    monkeypatch.setattr(
        pembayaran_service,
        "verify_midtrans_signature",
        lambda **_kwargs: False,
    )

    with pytest.raises(HTTPException) as exc_info:
        await pembayaran_service.process_midtrans_notification(
            db,
            {
                "order_id": transaction.midtrans_order_id,
                "status_code": "200",
                "gross_amount": "150000.00",
                "signature_key": "invalid",
                "transaction_status": "settlement",
            },
        )

    assert exc_info.value.status_code == 403
    assert db.commits == 0
