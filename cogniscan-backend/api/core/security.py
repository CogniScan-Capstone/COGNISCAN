"""
Modul keamanan CogniScan: password hashing dan JWT token management.

- Password hashing: bcrypt via passlib
- JWT: python-jose dengan algoritma HS256
"""

import logging
import secrets
import string
import time
from datetime import datetime, timedelta, timezone

# Suppress warning passlib + bcrypt 4.x compatibility
logging.getLogger("passlib").setLevel(logging.ERROR)

import httpx
from jose import JWTError, jwt
from passlib.context import CryptContext

from api.core.config import settings


# ── Password Hashing ──────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
_jwks_cache: dict[str, object] = {"expires_at": 0.0, "keys": []}


def hash_password(plain_password: str) -> str:
    """Hash password menggunakan bcrypt."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifikasi password plain terhadap hash bcrypt."""
    return pwd_context.verify(plain_password, hashed_password)


def generate_temporary_password(length: int = 20) -> str:
    """
    Generate temporary password kuat untuk akun psikolog yang baru di-approve.

    Password ini hanya boleh dikirim ke email psikolog dan wajib diganti saat
    login pertama. Jangan simpan atau tulis password ini ke log.
    """
    if length < 12:
        raise ValueError("Temporary password minimal 12 karakter")

    symbols = "!@#$%^&*()-_=+"
    alphabet = string.ascii_letters + string.digits + symbols
    rng = secrets.SystemRandom()

    password_chars = [
        rng.choice(string.ascii_lowercase),
        rng.choice(string.ascii_uppercase),
        rng.choice(string.digits),
        rng.choice(symbols),
    ]
    password_chars.extend(rng.choice(alphabet) for _ in range(length - len(password_chars)))
    rng.shuffle(password_chars)

    return "".join(password_chars)


# ── JWT Token ──────────────────────────────────────────────
def create_access_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Buat JWT access token.

    Args:
        data: Payload yang akan di-encode (biasanya {"sub": user_id}).
        expires_delta: Custom expiry. Default dari settings.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(
    data: dict,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Buat JWT refresh token (masa berlaku lebih lama dari access token).

    Args:
        data: Payload yang akan di-encode (biasanya {"sub": user_id}).
        expires_delta: Custom expiry. Default dari settings.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )

    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def _supabase_base_url() -> str | None:
    if not settings.SUPABASE_URL:
        return None

    url = settings.SUPABASE_URL.strip().rstrip("/")
    for suffix in ("/rest/v1", "/auth/v1"):
        if url.endswith(suffix):
            url = url[: -len(suffix)]
    return url


def _get_supabase_jwks() -> list[dict]:
    now = time.time()
    if _jwks_cache["expires_at"] > now:
        return list(_jwks_cache["keys"])

    supabase_url = _supabase_base_url()
    if not supabase_url:
        return []

    response = httpx.get(
        f"{supabase_url}/auth/v1/.well-known/jwks.json",
        timeout=10,
    )
    response.raise_for_status()
    keys = response.json().get("keys", [])

    # Supabase edge caches JWKS sekitar 10 menit; cache lokal dibuat sedikit
    # lebih pendek agar rotasi key tetap cepat terdeteksi saat development.
    _jwks_cache["keys"] = keys
    _jwks_cache["expires_at"] = now + 300
    return list(keys)


def decode_token(token: str) -> dict | None:
    """
    Decode dan validasi JWT token.

    Args:
        token: JWT string yang akan di-decode.

    Returns:
        Payload dict jika valid, None jika expired/invalid.
    """
    try:
        header = jwt.get_unverified_header(token)
        algorithm = header.get("alg")

        if algorithm in {"ES256", "RS256"}:
            kid = header.get("kid")
            keys = _get_supabase_jwks()
            key = next((item for item in keys if item.get("kid") == kid), None)
            if key is None:
                return None

            supabase_url = _supabase_base_url()
            issuer = f"{supabase_url}/auth/v1" if supabase_url else None
            return jwt.decode(
                token,
                key,
                algorithms=[algorithm],
                audience="authenticated",
                issuer=issuer,
            )

        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False} # Supabase uses "authenticated" as audience
        )
        return payload
    except JWTError:
        return None
