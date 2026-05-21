from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.core.config import settings
from api.models.pasien import Pasien
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.pengguna import Pengguna
from api.models.psikolog import Psikolog
from api.models.transaksi_pembayaran import TransaksiPembayaran
from api.schemas.pembayaran import (
    MidtransPaymentCreateResponse,
    PaymentReceiptResponse,
)
from api.services.midtrans_service import (
    MidtransServiceError,
    create_snap_transaction,
    map_midtrans_status,
    verify_midtrans_signature,
)
from api.services.meeting_service import ensure_online_meeting_room


def _generate_order_id(id_transaksi_pembayaran: int) -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"CGS-{today}-{id_transaksi_pembayaran:06d}"


def _as_decimal(value) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _booking_amount(booking: PemesananKonsultasi) -> Decimal:
    amount = _as_decimal(booking.total_biaya)
    if amount > 0:
        return amount

    if booking.psikolog and booking.psikolog.tarif_konsultasi:
        amount = _as_decimal(booking.psikolog.tarif_konsultasi)
        if amount > 0:
            return amount

    return Decimal("150000")


def _confirm_paid_booking(
    transaction: TransaksiPembayaran,
    booking: PemesananKonsultasi,
) -> None:
    transaction.waktu_bayar = transaction.waktu_bayar or datetime.now(timezone.utc)
    booking.status_pembayaran = "dibayar"
    booking.status_konsultasi = "terkonfirmasi"
    ensure_online_meeting_room(booking)
    if booking.jadwal is not None:
        booking.jadwal.apakah_tersedia = False


async def _get_patient_booking(
    db: AsyncSession,
    current_user: Pengguna,
    id_pemesanan_konsultasi: int,
) -> PemesananKonsultasi:
    result = await db.execute(
        select(PemesananKonsultasi)
        .join(Pasien, PemesananKonsultasi.id_pasien == Pasien.id_pasien)
        .where(
            PemesananKonsultasi.id_pemesanan_konsultasi == id_pemesanan_konsultasi,
            Pasien.id_pengguna == current_user.id,
        )
        .options(
            selectinload(PemesananKonsultasi.pasien),
            selectinload(PemesananKonsultasi.psikolog),
            selectinload(PemesananKonsultasi.jadwal),
            selectinload(PemesananKonsultasi.transaksi_pembayaran),
        )
    )
    booking = result.scalar_one_or_none()
    if booking is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking konsultasi tidak ditemukan",
        )
    return booking


async def create_midtrans_payment_for_booking(
    db: AsyncSession,
    current_user: Pengguna,
    id_pemesanan_konsultasi: int,
) -> MidtransPaymentCreateResponse:
    booking = await _get_patient_booking(db, current_user, id_pemesanan_konsultasi)

    if booking.status_pembayaran == "dibayar":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking ini sudah dibayar",
        )

    amount = _booking_amount(booking)
    if amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Total pembayaran booking tidak valid",
        )

    transaction = booking.transaksi_pembayaran
    if transaction is None:
        transaction = TransaksiPembayaran(
            id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
            jumlah_bayar=amount,
            status_transaksi="proses",
        )
        db.add(transaction)
        await db.flush()

    order_id = transaction.midtrans_order_id or _generate_order_id(
        transaction.id_transaksi_pembayaran
    )

    # Gunakan kembali snap token dan redirect url jika sudah ada untuk menghindari error "order_id sudah digunakan"
    if transaction.midtrans_snap_token and transaction.midtrans_redirect_url:
        return MidtransPaymentCreateResponse(
            id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
            id_transaksi_pembayaran=transaction.id_transaksi_pembayaran,
            order_id=order_id,
            snap_token=transaction.midtrans_snap_token,
            redirect_url=transaction.midtrans_redirect_url,
            client_key=settings.MIDTRANS_CLIENT_KEY or "",
            snap_script_url=settings.midtrans_snap_script_url,
            jumlah_bayar=amount,
            status_transaksi=transaction.status_transaksi,
        )

    customer_name = booking.pasien.nama_lengkap if booking.pasien else "Pasien CogniScan"
    customer_phone = booking.pasien.no_hp_wa if booking.pasien else None
    item_name = f"Konsultasi CogniScan #{booking.id_pemesanan_konsultasi}"

    try:
        snap = await create_snap_transaction(
            order_id=order_id,
            gross_amount=amount,
            customer_name=customer_name,
            customer_email=current_user.email,
            customer_phone=customer_phone,
            item_name=item_name,
        )
    except MidtransServiceError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    transaction.midtrans_order_id = order_id
    transaction.nomor_nota = transaction.nomor_nota or order_id
    transaction.jumlah_bayar = amount
    transaction.midtrans_snap_token = snap["token"]
    transaction.midtrans_redirect_url = snap["redirect_url"]
    transaction.status_transaksi = "menunggu"
    booking.status_konsultasi = "menunggu_pembayaran"
    booking.status_pembayaran = "belum_bayar"
    booking.total_biaya = amount

    await db.commit()
    await db.refresh(transaction)

    return MidtransPaymentCreateResponse(
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        id_transaksi_pembayaran=transaction.id_transaksi_pembayaran,
        order_id=order_id,
        snap_token=transaction.midtrans_snap_token or "",
        redirect_url=transaction.midtrans_redirect_url or "",
        client_key=settings.MIDTRANS_CLIENT_KEY or "",
        snap_script_url=settings.midtrans_snap_script_url,
        jumlah_bayar=amount,
        status_transaksi=transaction.status_transaksi,
    )


async def process_midtrans_notification(
    db: AsyncSession,
    payload: dict,
) -> tuple[TransaksiPembayaran, str]:
    order_id = payload.get("order_id")
    status_code = payload.get("status_code")
    gross_amount = payload.get("gross_amount")
    signature_key = payload.get("signature_key")

    if not verify_midtrans_signature(
        order_id=order_id,
        status_code=status_code,
        gross_amount=gross_amount,
        signature_key=signature_key,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Signature Midtrans tidak valid",
        )

    result = await db.execute(
        select(TransaksiPembayaran)
        .where(TransaksiPembayaran.midtrans_order_id == order_id)
        .options(
            selectinload(TransaksiPembayaran.pemesanan).selectinload(
                PemesananKonsultasi.jadwal
            )
        )
    )
    transaction = result.scalar_one_or_none()
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaksi pembayaran tidak ditemukan",
        )

    transaction_status = payload.get("transaction_status")
    fraud_status = payload.get("fraud_status")
    internal_status = map_midtrans_status(transaction_status, fraud_status)

    transaction.midtrans_transaction_id = payload.get("transaction_id")
    transaction.midtrans_payment_type = payload.get("payment_type")
    transaction.midtrans_fraud_status = fraud_status
    transaction.midtrans_status_code = status_code
    transaction.midtrans_status_message = payload.get("status_message")
    transaction.midtrans_transaction_status = transaction_status
    transaction.status_transaksi = internal_status
    transaction.metode_pembayaran = payload.get("payment_type")
    transaction.payload_notifikasi = payload

    booking = transaction.pemesanan
    if booking is not None:
        if internal_status == "berhasil":
            _confirm_paid_booking(transaction, booking)
        elif internal_status == "menunggu":
            booking.status_pembayaran = "belum_bayar"
            booking.status_konsultasi = "menunggu_pembayaran"
        elif internal_status in {"gagal", "kedaluwarsa", "dibatalkan"}:
            booking.status_pembayaran = internal_status
            booking.status_konsultasi = "menunggu_pembayaran"
            if booking.jadwal is not None:
                booking.jadwal.apakah_tersedia = True

    await db.commit()
    await db.refresh(transaction)
    return transaction, internal_status


async def sync_payment_status_if_needed(
    db: AsyncSession,
    transaction: TransaksiPembayaran,
) -> None:
    """Mencocokkan status transaksi lokal dengan API Midtrans jika statusnya masih pending."""
    if transaction.status_transaksi not in {"menunggu", "proses"}:
        return

    order_id = transaction.midtrans_order_id
    if not order_id:
        return

    try:
        from api.services.midtrans_service import get_midtrans_transaction_status
        payload = await get_midtrans_transaction_status(order_id)
        if not payload:
            return

        transaction_status = payload.get("transaction_status")
        if not transaction_status:
            return

        fraud_status = payload.get("fraud_status")
        internal_status = map_midtrans_status(transaction_status, fraud_status)

        if internal_status != transaction.status_transaksi:
            transaction.midtrans_transaction_id = payload.get("transaction_id")
            transaction.midtrans_payment_type = payload.get("payment_type")
            transaction.midtrans_fraud_status = fraud_status
            transaction.midtrans_status_code = payload.get("status_code")
            transaction.midtrans_status_message = payload.get("status_message")
            transaction.midtrans_transaction_status = transaction_status
            transaction.status_transaksi = internal_status
            transaction.metode_pembayaran = payload.get("payment_type")
            transaction.payload_notifikasi = payload

            booking = transaction.pemesanan
            if booking is not None:
                if internal_status == "berhasil":
                    _confirm_paid_booking(transaction, booking)
                elif internal_status in {"gagal", "kedaluwarsa", "dibatalkan"}:
                    booking.status_pembayaran = internal_status
                    booking.status_konsultasi = "menunggu_pembayaran"
                    if booking.jadwal is not None:
                        booking.jadwal.apakah_tersedia = True

            await db.commit()
    except Exception:
        # Gagal secara diam-diam agar tidak menghalangi loading halaman receipt
        pass


async def get_payment_receipt_by_order_id(
    db: AsyncSession,
    current_user: Pengguna,
    order_id: str,
) -> PaymentReceiptResponse:
    result = await db.execute(
        select(TransaksiPembayaran)
        .join(
            PemesananKonsultasi,
            TransaksiPembayaran.id_pemesanan_konsultasi
            == PemesananKonsultasi.id_pemesanan_konsultasi,
        )
        .join(Pasien, PemesananKonsultasi.id_pasien == Pasien.id_pasien)
        .where(
            TransaksiPembayaran.midtrans_order_id == order_id,
            Pasien.id_pengguna == current_user.id,
        )
        .options(
            selectinload(TransaksiPembayaran.pemesanan).selectinload(
                PemesananKonsultasi.pasien
            ),
            selectinload(TransaksiPembayaran.pemesanan).selectinload(
                PemesananKonsultasi.psikolog
            ),
            selectinload(TransaksiPembayaran.pemesanan).selectinload(
                PemesananKonsultasi.jadwal
            ),
        )
    )
    transaction = result.scalar_one_or_none()
    if transaction is None or transaction.pemesanan is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Receipt pembayaran tidak ditemukan",
        )

    # Sinkronkan status pembayaran secara langsung dengan API Midtrans
    await sync_payment_status_if_needed(db, transaction)

    booking = transaction.pemesanan
    return PaymentReceiptResponse(
        id_pemesanan_konsultasi=booking.id_pemesanan_konsultasi,
        id_transaksi_pembayaran=transaction.id_transaksi_pembayaran,
        order_id=transaction.midtrans_order_id,
        nomor_nota=transaction.nomor_nota,
        nama_pasien=booking.pasien.nama_lengkap if booking.pasien else None,
        nama_psikolog=booking.psikolog.nama_lengkap if booking.psikolog else None,
        metode_konsultasi=booking.mode_konsultasi,
        metode_pembayaran=transaction.metode_pembayaran,
        jumlah_bayar=_as_decimal(transaction.jumlah_bayar),
        status_transaksi=transaction.status_transaksi,
        status_konsultasi=booking.status_konsultasi,
        status_pembayaran=booking.status_pembayaran,
        link_pertemuan=booking.link_pertemuan,
        platform_pertemuan=booking.platform_pertemuan,
        lokasi_konsultasi=booking.psikolog.alamat_praktik if booking.psikolog else None,
        tanggal_konsultasi=booking.jadwal.tanggal_praktik if booking.jadwal else None,
        waktu_konsultasi=booking.jadwal.waktu_mulai.isoformat(timespec="minutes")
        if booking.jadwal and booking.jadwal.waktu_mulai
        else None,
        tanggal_booking=booking.tanggal_booking,
        waktu_bayar=transaction.waktu_bayar,
        midtrans_transaction_id=transaction.midtrans_transaction_id,
        midtrans_transaction_status=transaction.midtrans_transaction_status,
        midtrans_fraud_status=transaction.midtrans_fraud_status,
    )
