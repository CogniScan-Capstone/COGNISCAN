from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.database import get_db
from api.dependencies.auth import (
    SupabaseClaims,
    get_current_active_psikolog,
    get_current_user,
    require_role,
    verify_supabase_token,
)
from api.schemas.auth import (
    ChangeTemporaryPasswordRequest,
    MessageResponse,
    ProfilePasienCreate,
    ProfilePasienResponse,
    ProfilePasienUpdate,
    ProfilePsikologCreate,
    ProfilePsikologResponse,
    ProfilePsikologUpdate,
    PsikologRegistrationResponse,
    UserResponse,
)
from api.services.auth_service import (
    change_psikolog_temporary_password,
    create_pasien_profile,
    get_pasien_profile,
    register_psikolog_candidate,
    update_pasien_profile,
    update_psikolog_profile,
)
from api.models.admin import Admin
from api.models.pasien import Pasien
from api.models.pengguna import Pengguna
from api.models.psikolog import Psikolog

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


@router.get(
    "/profile/pasien",
    response_model=ProfilePasienResponse,
)
async def read_profile_pasien(
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """
    Mengambil profil pasien milik user yang sedang login.
    """
    return await get_pasien_profile(db=db, current_user=current_user)


@router.patch(
    "/profile/pasien",
    response_model=ProfilePasienResponse,
)
async def update_profile_pasien(
    profile_data: ProfilePasienUpdate,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """
    Update profil pasien milik user yang sedang login.

    Tidak mengubah email, password, role, atau status aktif pengguna.
    """
    return await update_pasien_profile(
        db=db,
        current_user=current_user,
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


@router.patch(
    "/profile/psikolog",
    response_model=ProfilePsikologResponse,
)
async def update_profile_psikolog(
    profile_data: ProfilePsikologUpdate,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """
    Update profil/praktik psikolog milik user yang sedang login.

    Field verifikasi seperti email, STR, SIP, dokumen, dan status akun tidak
    bisa diubah lewat endpoint ini.
    """
    return await update_psikolog_profile(
        db=db,
        current_user=current_user,
        profile_data=profile_data,
    )


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
async def read_users_me(
    current_user: Pengguna = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mendapatkan profil pengguna yang sedang login berdasarkan token JWT Supabase.
    Jika ini berhasil, berarti token valid dan user ada di tabel Pengguna.
    """
    nama_lengkap = None

    if current_user.peran == "pasien":
        result = await db.execute(
            select(Pasien.nama_lengkap).where(Pasien.id_pengguna == current_user.id)
        )
        nama_lengkap = result.scalar_one_or_none()
    elif current_user.peran == "psikolog":
        result = await db.execute(
            select(Psikolog.nama_lengkap).where(Psikolog.id_pengguna == current_user.id)
        )
        nama_lengkap = result.scalar_one_or_none()
    elif current_user.peran == "admin":
        result = await db.execute(
            select(Admin.nama_lengkap).where(Admin.id_pengguna == current_user.id)
        )
        nama_lengkap = result.scalar_one_or_none()

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        peran=current_user.peran,
        apakah_aktif=current_user.apakah_aktif,
        nama_lengkap=nama_lengkap,
    )
