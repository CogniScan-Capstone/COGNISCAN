"""Rate limit helpers untuk endpoint sensitif CogniScan."""

from hashlib import sha256

from fastapi import Request
from loguru import logger
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.core.config import settings


def is_local_rate_limit_storage(storage_uri: str | None) -> bool:
    """Return True jika rate limit storage hanya lokal/in-memory."""
    if not storage_uri:
        return True

    scheme = storage_uri.split(":", 1)[0].lower()
    return scheme in {"", "memory"}


def _warn_if_production_uses_local_storage() -> None:
    if (
        settings.is_production
        and settings.RATE_LIMIT_ENABLED
        and is_local_rate_limit_storage(settings.RATE_LIMIT_STORAGE_URL)
    ):
        logger.warning(
            "RATE_LIMIT_STORAGE_URL masih memakai storage lokal. "
            "Untuk production multi-instance gunakan Redis/Valkey, misalnya redis://host:6379/0."
        )


def _client_key(request: Request) -> str:
    """Gunakan token hash jika ada, fallback ke IP request."""
    authorization = request.headers.get("authorization", "")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "bearer" and token.strip():
        digest = sha256(token.strip().encode("utf-8")).hexdigest()
        return f"auth:{digest}"

    if settings.RATE_LIMIT_TRUST_PROXY_HEADERS:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return f"ip:{forwarded_for.split(',', 1)[0].strip()}"

    return f"ip:{get_remote_address(request) or 'unknown'}"


_warn_if_production_uses_local_storage()

limiter = Limiter(
    key_func=_client_key,
    storage_uri=settings.RATE_LIMIT_STORAGE_URL,
    enabled=settings.RATE_LIMIT_ENABLED,
    swallow_errors=True,
)
