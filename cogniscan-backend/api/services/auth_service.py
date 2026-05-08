from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from fastapi import HTTPException, status
import uuid

from api.models.pengguna import Pengguna
from api.models.pasien import Pasien
from api.schemas.auth import ProfilePasienCreate

async def create_pasien_profile(db: AsyncSession, user_id: uuid.UUID, profile_data: ProfilePasienCreate) -> Pengguna:
    """
    Membuat profil Pengguna dan Pasien di database backend setelah
    user berhasil mendaftar (sign up) di Supabase Auth.
    """
    # Check if user already exists
    stmt = select(Pengguna).where(Pengguna.id == user_id)
    result = await db.execute(stmt)
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Profil pengguna sudah ada"
        )
        
    # Check if email is already taken in our DB (just in case)
    stmt_email = select(Pengguna).where(Pengguna.email == profile_data.email)
    result_email = await db.execute(stmt_email)
    if result_email.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sudah terdaftar di sistem"
        )
        
    # Create Pengguna (ID corresponds to Supabase auth.users ID)
    new_pengguna = Pengguna(
        id=user_id,
        email=profile_data.email,
        peran="pasien",
        apakah_aktif=True
    )
    db.add(new_pengguna)
    await db.flush() # To make new_pengguna available
    
    # Create Pasien profile
    new_pasien = Pasien(
        id_pengguna=new_pengguna.id,
        nama_lengkap=profile_data.nama_lengkap,
        no_hp_wa=profile_data.no_hp_wa,
        jenis_kelamin=profile_data.jenis_kelamin
    )
    db.add(new_pasien)
    await db.commit()
    await db.refresh(new_pengguna)
    
    return new_pengguna
