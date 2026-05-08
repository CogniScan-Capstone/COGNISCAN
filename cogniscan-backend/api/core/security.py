"""
Modul keamanan CogniScan: password hashing dan JWT token management.

- Password hashing: bcrypt via passlib
- JWT: python-jose dengan algoritma HS256
"""

import logging
from datetime import datetime, timedelta, timezone

# Suppress warning passlib + bcrypt 4.x compatibility
logging.getLogger("passlib").setLevel(logging.ERROR)

from jose import JWTError, jwt
from passlib.context import CryptContext

from api.core.config import settings


# ── Password Hashing ──────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash password menggunakan bcrypt."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifikasi password plain terhadap hash bcrypt."""
    return pwd_context.verify(plain_password, hashed_password)


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


def decode_token(token: str) -> dict | None:
    """
    Decode dan validasi JWT token.

    Args:
        token: JWT string yang akan di-decode.

    Returns:
        Payload dict jika valid, None jika expired/invalid.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        return None
