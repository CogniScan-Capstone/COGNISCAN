"""Rate limit helpers untuk endpoint sensitif CogniScan."""

from hashlib import sha256

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from api.core.config import settings


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


limiter = Limiter(
    key_func=_client_key,
    storage_uri=settings.RATE_LIMIT_STORAGE_URL,
    enabled=settings.RATE_LIMIT_ENABLED,
    swallow_errors=True,
)
