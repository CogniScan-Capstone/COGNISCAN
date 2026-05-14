import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from api.models.pasien import Pasien
from api.models.pengguna import Pengguna
from api.schemas.auth import ProfilePasienCreate


async def create_pasien_profile(
    db: AsyncSession,
    user_id: uuid.UUID,
    email: str,
    profile_data: ProfilePasienCreate,
) -> Pengguna:
    """
    Membuat profil Pengguna dan Pasien di database backend setelah
    user berhasil mendaftar (sign up) di Supabase Auth.

    `user_id` dan `email` diambil dari klaim JWT Supabase (bukan dari body),
    sehingga tidak bisa dipalsukan dari sisi frontend.
    """
    stmt = select(Pengguna).where(Pengguna.id == user_id)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profil pengguna sudah ada",
        )

    stmt_email = select(Pengguna).where(Pengguna.email == email)
    result_email = await db.execute(stmt_email)
    if result_email.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sudah terdaftar di sistem",
        )

    new_pengguna = Pengguna(
        id=user_id,
        email=email,
        peran="pasien",
        apakah_aktif=True,
    )
    db.add(new_pengguna)
    await db.flush()

    new_pasien = Pasien(
        id_pengguna=new_pengguna.id,
        nama_lengkap=profile_data.nama_lengkap,
        jenis_kelamin=profile_data.jenis_kelamin,
        tanggal_lahir=profile_data.tanggal_lahir,
        alamat_lengkap=profile_data.alamat_lengkap,
        no_hp_wa=profile_data.no_hp_wa,
    )
    db.add(new_pasien)
    await db.commit()
    await db.refresh(new_pengguna)

    return new_pengguna
