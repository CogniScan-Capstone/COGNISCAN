from dataclasses import dataclass
from typing import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid


from api.core.security import decode_token
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.models.psikolog import Psikolog


@dataclass(frozen=True)
class SupabaseClaims:
    """Klaim minimum yang diambil dari JWT Supabase."""
    user_id: uuid.UUID
    email: str

# Backend menerima access token Supabase lewat header:
# Authorization: Bearer <access_token>
bearer_scheme = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db)
) -> Pengguna:
    """
    Dependency untuk mendapatkan data user yang sedang login berdasarkan JWT.
    Melempar 401 Unauthorized jika token tidak valid atau user tidak ditemukan.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise credentials_exception
    
    user_id_str: str = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception
        
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    # Query user dari database
    result = await db.execute(select(Pengguna).where(Pengguna.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    if not user.apakah_aktif:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
        
    return user

async def verify_supabase_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> SupabaseClaims:
    """
    Validasi token JWT Supabase tanpa cek ke database (digunakan saat pertama kali buat profil).
    Mengembalikan user_id dan email dari klaim JWT — email tidak boleh dipercaya
    dari body request karena bisa dipalsukan.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Supabase uses JWT with 'sub' containing the user ID
    # In decode_token we set options={"verify_aud": False} to accept it
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise credentials_exception

    user_id_str = payload.get("sub")
    email = payload.get("email")
    if not user_id_str or not email:
        raise credentials_exception

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    return SupabaseClaims(user_id=user_id, email=email)

async def get_current_active_admin(
    current_user: Pengguna = Depends(get_current_user)
) -> Pengguna:
    """Dependency khusus untuk endpoint yang hanya boleh diakses Admin."""
    if current_user.peran != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user


def require_role(*allowed_roles: str) -> Callable:
    """Factory dependency untuk membatasi endpoint berdasarkan role pengguna."""

    async def _role_dependency(
        current_user: Pengguna = Depends(get_current_user),
    ) -> Pengguna:
        if current_user.peran not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The user doesn't have enough privileges",
            )
        return current_user

    return _role_dependency


async def get_current_active_psikolog(
    current_user: Pengguna = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Pengguna:
    """
    Dependency khusus untuk endpoint yang hanya boleh diakses psikolog aktif.

    Psikolog wajib sudah diverifikasi admin dan sudah mengganti temporary
    password sebelum mengakses fitur profesional seperti jadwal/konsultasi.
    """
    if current_user.peran != "psikolog":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )

    result = await db.execute(
        select(Psikolog).where(Psikolog.id_pengguna == current_user.id)
    )
    psikolog = result.scalar_one_or_none()
    if psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Profil psikolog tidak ditemukan",
        )

    if psikolog.status_akun != "terverifikasi":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun psikolog belum terverifikasi",
        )

    if not psikolog.apakah_sudah_ganti_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Psikolog wajib mengganti temporary password terlebih dahulu",
        )

    return current_user
