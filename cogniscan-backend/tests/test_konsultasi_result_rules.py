from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException

from api.models.jadwal_psikolog import JadwalPsikolog
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.transaksi_pembayaran import TransaksiPembayaran
from api.schemas.konsultasi import ConsultationResultCreate
from api.services import konsultasi_service


def _booking(
    *,
    starts_in_minutes: int = -30,
    status_konsultasi: str = "terkonfirmasi",
    status_pembayaran: str = "dibayar",
    transaction_status: str = "berhasil",
) -> PemesananKonsultasi:
    start_at = datetime.now(konsultasi_service.CONSULTATION_TIMEZONE) + timedelta(
        minutes=starts_in_minutes
    )
    booking = PemesananKonsultasi(
        id_pemesanan_konsultasi=1,
        status_konsultasi=status_konsultasi,
        status_pembayaran=status_pembayaran,
    )
    booking.jadwal = JadwalPsikolog(
        id_jadwal_psikolog=1,
        tanggal_praktik=start_at.date(),
        waktu_mulai=start_at.time().replace(second=0, microsecond=0),
    )
    booking.transaksi_pembayaran = TransaksiPembayaran(
        id_transaksi_pembayaran=1,
        status_transaksi=transaction_status,
    )
    return booking


def _payload(**overrides) -> ConsultationResultCreate:
    data = {
        "pasien_hadir": True,
        "ringkasan_untuk_pasien": "Pasien hadir dan mampu menjelaskan kondisi dengan baik.",
        "catatan_internal": "Catatan klinis internal.",
        "rekomendasi_tindak_lanjut": "Latihan napas dan sesi lanjutan bila diperlukan.",
        "perlu_sesi_lanjutan": False,
    }
    data.update(overrides)
    return ConsultationResultCreate(**data)


def test_consultation_result_requires_paid_booking():
    booking = _booking(
        status_konsultasi="menunggu_pembayaran",
        status_pembayaran="belum_bayar",
        transaction_status="menunggu",
    )

    with pytest.raises(HTTPException) as exc_info:
        konsultasi_service._validate_result_submission(booking, _payload())

    assert exc_info.value.status_code == 400
    assert "sudah dibayar" in exc_info.value.detail


@pytest.mark.parametrize("blocked_status", ["dibatalkan", "dibatalkan_pasien", "payment_kedaluwarsa", "ditutup"])
def test_consultation_result_rejects_blocked_booking_statuses(blocked_status):
    booking = _booking(status_konsultasi=blocked_status)

    with pytest.raises(HTTPException) as exc_info:
        konsultasi_service._validate_result_submission(booking, _payload())

    assert exc_info.value.status_code == 400
    assert "tidak dapat diberi hasil" in exc_info.value.detail


def test_consultation_result_cannot_be_submitted_before_start_time():
    booking = _booking(starts_in_minutes=60)

    with pytest.raises(HTTPException) as exc_info:
        konsultasi_service._validate_result_submission(booking, _payload())

    assert exc_info.value.status_code == 400
    assert "sebelum jadwal" in exc_info.value.detail


def test_consultation_result_requires_patient_summary_when_patient_attended():
    booking = _booking()

    with pytest.raises(HTTPException) as exc_info:
        konsultasi_service._validate_result_submission(
            booking,
            _payload(ringkasan_untuk_pasien="terlalu"),
        )

    assert exc_info.value.status_code == 400
    assert "Ringkasan untuk pasien wajib" in exc_info.value.detail


def test_consultation_result_allows_no_show_without_patient_summary():
    booking = _booking()

    record = konsultasi_service._validate_result_submission(
        booking,
        _payload(
            pasien_hadir=False,
            ringkasan_untuk_pasien="   ",
            catatan_internal="  Tidak hadir.  ",
            rekomendasi_tindak_lanjut="   ",
        ),
    )

    assert record.ringkasan_untuk_pasien is None
    assert record.catatan_internal == "Tidak hadir."
    assert record.rekomendasi_tindak_lanjut is None


def test_consultation_result_cleans_text_fields_for_valid_submission():
    booking = _booking()

    record = konsultasi_service._validate_result_submission(
        booking,
        _payload(
            ringkasan_untuk_pasien="  Ringkasan pasien cukup panjang.  ",
            catatan_internal="  Catatan internal.  ",
            rekomendasi_tindak_lanjut="  Rekomendasi tindak lanjut.  ",
            keluhan_utama="  Sulit tidur.  ",
            observasi_psikolog="  Afek tampak cemas.  ",
            asesmen_klinis="  Gejala cemas ringan.  ",
            intervensi_diberikan="  Psikoedukasi dan grounding.  ",
            rencana_tindak_lanjut="  Evaluasi ulang pekan depan.  ",
            tingkat_risiko="  rendah  ",
        ),
    )

    assert record.ringkasan_untuk_pasien == "Ringkasan pasien cukup panjang."
    assert record.catatan_internal == "Catatan internal."
    assert record.rekomendasi_tindak_lanjut == "Rekomendasi tindak lanjut."
    assert record.keluhan_utama == "Sulit tidur."
    assert record.observasi_psikolog == "Afek tampak cemas."
    assert record.asesmen_klinis == "Gejala cemas ringan."
    assert record.intervensi_diberikan == "Psikoedukasi dan grounding."
    assert record.rencana_tindak_lanjut == "Evaluasi ulang pekan depan."
    assert record.tingkat_risiko == "rendah"
