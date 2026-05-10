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
    "password",
    "password_hash",
    "token",
    "access_token",
    "refresh_token",
    "authorization",
    "jwt",
    "api_key",
    "google_api_key",
    "narrative",
    "narasi",
    "teks_user",
}

SENSITIVE_PATTERN = re.compile(
    r"(?i)\b("
    r"password|password_hash|token|access_token|refresh_token|authorization|"
    r"jwt|api_key|google_api_key|narrative|narasi|teks_user"
    r")\b\s*[:=]\s*[^,\s}\]]+"
)


def _redact_value(value: Any) -> Any:
    """Redact nilai sensitif dalam struktur log sederhana."""
    if isinstance(value, Mapping):
        return {
            key: "[REDACTED]" if str(key).lower() in SENSITIVE_KEYS else _redact_value(val)
            for key, val in value.items()
        }

    if isinstance(value, list | tuple):
        return type(value)(_redact_value(item) for item in value)

    if isinstance(value, str):
        return SENSITIVE_PATTERN.sub(r"\1=[REDACTED]", value)

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
