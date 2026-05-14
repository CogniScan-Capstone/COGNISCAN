from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.database import get_db
from api.dependencies.auth import (
    SupabaseClaims,
    get_current_user,
    verify_supabase_token,
)
from api.schemas.auth import (
    ChangeTemporaryPasswordRequest,
    MessageResponse,
    ProfilePasienCreate,
    ProfilePsikologCreate,
    PsikologRegistrationResponse,
    UserResponse,
)
from api.services.auth_service import (
    change_psikolog_temporary_password,
    create_pasien_profile,
    register_psikolog_candidate,
)
from api.models.pengguna import Pengguna

router = APIRouter()


@router.post(
    "/profile/pasien",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_profile(
    profile_data: ProfilePasienCreate,
    claims: SupabaseClaims = Depends(verify_supabase_token),
    db: AsyncSession = Depends(get_db),
):
    """
    Endpoint untuk membuat profil Pasien dan Pengguna di backend.
    WAJIB dipanggil setelah user berhasil mendaftar (sign up) di Supabase Auth (dari sisi frontend).
    Memerlukan JWT token Supabase di header Authorization.

    `user_id` dan `email` diambil dari klaim JWT, bukan dari body — supaya
    frontend tidak bisa membuat profil atas nama user lain.
    """
    return await create_pasien_profile(
        db=db,
        user_id=claims.user_id,
        email=claims.email,
        profile_data=profile_data,
    )


@router.post(
    "/register/psikolog",
    response_model=PsikologRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_psikolog(
    profile_data: ProfilePsikologCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Registrasi calon psikolog sebelum approval admin.

    Akun login Supabase Auth belum dibuat di tahap ini. Setelah admin approve,
    backend membuat akun Supabase Auth dengan temporary password dan mengirimnya
    ke email psikolog.
    """
    return await register_psikolog_candidate(db=db, profile_data=profile_data)


@router.post(
    "/change-temporary-password",
    response_model=MessageResponse,
)
async def change_temporary_password(
    payload: ChangeTemporaryPasswordRequest,
    current_user: Pengguna = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Psikolog mengganti temporary password setelah login pertama.
    """
    await change_psikolog_temporary_password(
        db=db,
        current_user=current_user,
        new_password=payload.new_password,
    )
    return MessageResponse(message="Password berhasil diganti")

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: Pengguna = Depends(get_current_user)):
    """
    Mendapatkan profil pengguna yang sedang login berdasarkan token JWT Supabase.
    Jika ini berhasil, berarti token valid dan user ada di tabel Pengguna.
    """
    return current_user
