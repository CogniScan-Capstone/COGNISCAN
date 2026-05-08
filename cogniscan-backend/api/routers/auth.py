from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from api.dependencies.database import get_db
from api.dependencies.auth import get_current_user, verify_supabase_token
from api.schemas.auth import ProfilePasienCreate, UserResponse
from api.services.auth_service import create_pasien_profile
from api.models.pengguna import Pengguna

router = APIRouter()

@router.post("/profile/pasien", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    profile_data: ProfilePasienCreate, 
    user_id: uuid.UUID = Depends(verify_supabase_token),
    db: AsyncSession = Depends(get_db)
):
    """
    Endpoint untuk membuat profil Pasien dan Pengguna di backend.
    WAJIB dipanggil setelah user berhasil mendaftar (sign up) di Supabase Auth (dari sisi frontend).
    Memerlukan JWT token Supabase di header Authorization.
    """
    return await create_pasien_profile(db, user_id, profile_data)

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: Pengguna = Depends(get_current_user)):
    """
    Mendapatkan profil pengguna yang sedang login berdasarkan token JWT Supabase.
    Jika ini berhasil, berarti token valid dan user ada di tabel Pengguna.
    """
    return current_user
