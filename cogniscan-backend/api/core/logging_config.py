"""
Konfigurasi logging aplikasi CogniScan.

Log tidak boleh menyimpan password, token, API key, atau narasi mentah pengguna.
Module ini menyaring pola sensitif umum sebelum pesan ditulis ke stdout.
"""

import logging
import re
import sys
from collections.abc import Mapping
from typing import Any

from loguru import logger

from api.core.config import settings


SENSITIVE_KEYS = {
    "access_token",
    "api_key",
    "asesmen_klinis",
    "audio",
    "audio_bytes",
    "authorization",
    "catatan_internal",
    "catatan_internal_psikolog",
    "draft_catatan_internal",
    "draft_feedback_psikolog",
    "feedback_psikolog",
    "google_api_key",
    "jwt",
    "midtrans_client_key",
    "midtrans_server_key",
    "midtrans_snap_token",
    "narasi",
    "narrative",
    "new_password",
    "observasi_psikolog",
    "password",
    "password_baru",
    "password_hash",
    "payload_notifikasi",
    "raw_payload",
    "refresh_token",
    "ringkasan_kondisi",
    "ringkasan_untuk_pasien",
    "signature_key",
    "smtp_password",
    "snap_token",
    "supabase_service_role_key",
    "temporary_password",
    "teks_jawaban",
    "teks_pertanyaan",
    "teks_user",
    "token",
}

_SENSITIVE_KEY_PATTERN = "|".join(
    re.escape(key) for key in sorted(SENSITIVE_KEYS, key=len, reverse=True)
)
SENSITIVE_PATTERN = re.compile(
    r"(?i)\b(?P<key>("
    + _SENSITIVE_KEY_PATTERN
    + r"))\b(?P<sep>\s*[:=]\s*)(\".*?\"|'.*?'|[^,\s}\]]+)"
)
BEARER_PATTERN = re.compile(r"(?i)\bBearer\s+[A-Za-z0-9._~+/=-]+")


def _redact_sensitive_string(value: str) -> str:
    value = BEARER_PATTERN.sub("Bearer [REDACTED]", value)
    return SENSITIVE_PATTERN.sub(
        lambda match: f"{match.group('key')}{match.group('sep')}[REDACTED]",
        value,
    )


def _redact_value(value: Any) -> Any:
    """Redact nilai sensitif dalam struktur log sederhana."""
    if isinstance(value, Mapping):
        return {
            key: "[REDACTED]" if str(key).lower() in SENSITIVE_KEYS else _redact_value(val)
            for key, val in value.items()
        }

    if isinstance(value, (list, tuple)):
        return type(value)(_redact_value(item) for item in value)

    if isinstance(value, str):
        return _redact_sensitive_string(value)

    return value


def _sanitize_record(record: dict[str, Any]) -> bool:
    """Filter loguru yang membersihkan message dan extra sebelum ditulis."""
    record["message"] = _redact_value(record["message"])
    record["extra"].update(_redact_value(dict(record["extra"])))
    return True


class InterceptHandler(logging.Handler):
    """Arahkan standard logging Python ke loguru."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        logger.opt(depth=6, exception=record.exc_info).log(level, record.getMessage())


def setup_logging() -> None:
    """Setup logging global untuk FastAPI, Uvicorn, dan library Python."""
    logger.remove()
    logger.add(
        sys.stdout,
        level="DEBUG" if settings.DEBUG else "INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} [{level}] {message}",
        filter=_sanitize_record,
        backtrace=False,
        diagnose=False,
    )

    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

    for logger_name in ("uvicorn", "uvicorn.error", "uvicorn.access", "sqlalchemy.engine"):
        logging.getLogger(logger_name).handlers = [InterceptHandler()]
        logging.getLogger(logger_name).propagate = False
