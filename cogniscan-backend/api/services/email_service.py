from __future__ import annotations

import asyncio
import smtplib
from email.message import EmailMessage

from api.core.config import settings


class EmailServiceError(Exception):
    """Error saat mengirim email."""


class EmailServiceNotConfiguredError(EmailServiceError):
    """SMTP belum dikonfigurasi di environment."""


def _require_smtp_config() -> tuple[str, int, str, str, str, bool]:
    if (
        not settings.SMTP_HOST
        or not settings.SMTP_USERNAME
        or not settings.SMTP_PASSWORD
        or not settings.SMTP_SENDER_EMAIL
    ):
        raise EmailServiceNotConfiguredError(
            "SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD, dan SMTP_SENDER_EMAIL wajib di-set"
        )

    return (
        settings.SMTP_HOST,
        settings.SMTP_PORT,
        settings.SMTP_USERNAME,
        settings.SMTP_PASSWORD,
        settings.SMTP_SENDER_EMAIL,
        settings.SMTP_USE_TLS,
    )


def _send_email_sync(message: EmailMessage) -> None:
    host, port, username, password, _sender, use_tls = _require_smtp_config()
    with smtplib.SMTP(host, port, timeout=20) as smtp:
        if use_tls:
            smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(message)


async def send_psikolog_temporary_password(
    *,
    recipient_email: str,
    nama_lengkap: str,
    temporary_password: str,
) -> None:
    """Kirim temporary password ke psikolog yang baru di-approve."""
    _host, _port, _username, _password, sender, _use_tls = _require_smtp_config()

    message = EmailMessage()
    message["Subject"] = "Akun Psikolog CogniScan Telah Diverifikasi"
    message["From"] = sender
    message["To"] = recipient_email
    message.set_content(
        f"""Halo {nama_lengkap},

Akun psikolog CogniScan Anda telah diverifikasi oleh admin.

Silakan login menggunakan kredensial sementara berikut:

Email: {recipient_email}
Temporary password: {temporary_password}

Setelah login pertama, Anda wajib mengganti password sebelum dapat mengakses fitur psikolog.

Link login: {settings.FRONTEND_LOGIN_URL}

Jika Anda tidak merasa mendaftar sebagai psikolog CogniScan, abaikan email ini.
"""
    )

    await asyncio.to_thread(_send_email_sync, message)


async def send_psikolog_rejection_email(
    *,
    recipient_email: str,
    nama_lengkap: str,
    alasan: str,
) -> None:
    """Kirim email penolakan verifikasi psikolog."""
    _host, _port, _username, _password, sender, _use_tls = _require_smtp_config()

    message = EmailMessage()
    message["Subject"] = "Verifikasi Akun Psikolog CogniScan Ditolak"
    message["From"] = sender
    message["To"] = recipient_email
    message.set_content(
        f"""Halo {nama_lengkap},

Mohon maaf, verifikasi akun psikolog CogniScan Anda belum dapat disetujui.

Alasan:
{alasan}

Silakan perbaiki data atau dokumen verifikasi sesuai arahan admin.
"""
    )

    await asyncio.to_thread(_send_email_sync, message)
