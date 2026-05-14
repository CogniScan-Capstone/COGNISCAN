from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid


from api.core.security import decode_token
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna


@dataclass(frozen=True)
class SupabaseClaims:
    """Klaim minimum yang diambil dari JWT Supabase."""
    user_id: uuid.UUID
    email: str

# Endpoint login untuk dokumentasi Swagger
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
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
    
    payload = decode_token(token)
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

async def verify_supabase_token(token: str = Depends(oauth2_scheme)) -> SupabaseClaims:
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
    payload = decode_token(token)
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

async def get_current_active_psikolog(
    current_user: Pengguna = Depends(get_current_user)
) -> Pengguna:
    """Dependency khusus untuk endpoint yang hanya boleh diakses Psikolog."""
    if current_user.peran != "psikolog":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user
