from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.config import settings
from api.core.security import generate_temporary_password
from api.models.admin import Admin
from api.models.pengguna import Pengguna
from api.models.psikolog import Psikolog
from api.services.email_service import (
    EmailServiceError,
    send_psikolog_rejection_email,
    send_psikolog_temporary_password,
)
from api.services.supabase_auth_admin import (
    SupabaseAuthAdminError,
    create_user_with_temporary_password,
    delete_user,
)


async def list_psikolog_by_status(
    db: AsyncSession,
    status_akun: str | None = None,
) -> list[Psikolog]:
    stmt = select(Psikolog).order_by(Psikolog.dibuat_pada.desc())
    if status_akun:
        stmt = stmt.where(Psikolog.status_akun == status_akun)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def approve_psikolog(
    db: AsyncSession,
    id_psikolog: int,
    current_admin: Pengguna,
) -> Psikolog:
    """
    Approve psikolog dan buat akun Supabase Auth dengan temporary password.

    Urutan sengaja ketat:
    1. validasi local DB
    2. generate temporary password
    3. create Supabase Auth user
    4. kirim email temporary password
    5. commit local DB
    """
    result = await db.execute(select(Psikolog).where(Psikolog.id_psikolog == id_psikolog))
    psikolog = result.scalar_one_or_none()
    if psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data psikolog tidak ditemukan",
        )

    if psikolog.status_akun == "terverifikasi":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Akun psikolog sudah terverifikasi",
        )

    if psikolog.status_akun == "ditolak":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Akun psikolog sudah ditolak",
        )

    if not psikolog.email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email psikolog belum diisi",
        )

    existing_pengguna = await db.execute(
        select(Pengguna).where(Pengguna.email == psikolog.email.lower())
    )
    if existing_pengguna.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sudah terdaftar sebagai pengguna",
        )

    admin_result = await db.execute(
        select(Admin).where(Admin.id_pengguna == current_admin.id)
    )
    admin_profile = admin_result.scalar_one_or_none()

    temporary_password = generate_temporary_password(settings.TEMP_PASSWORD_LENGTH)
    auth_user = None

    try:
        auth_user = await create_user_with_temporary_password(
            email=psikolog.email.lower(),
            temporary_password=temporary_password,
            nama_lengkap=psikolog.nama_lengkap,
        )
        await send_psikolog_temporary_password(
            recipient_email=psikolog.email.lower(),
            nama_lengkap=psikolog.nama_lengkap,
            temporary_password=temporary_password,
        )
    except EmailServiceError as exc:
        if auth_user is not None:
            try:
                await delete_user(auth_user.id)
            except SupabaseAuthAdminError:
                pass
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gagal mengirim email temporary password: {exc}",
        ) from exc
    except SupabaseAuthAdminError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gagal membuat akun Supabase Auth: {exc}",
        ) from exc

    pengguna = Pengguna(
        id=auth_user.id,
        email=auth_user.email.lower(),
        peran="psikolog",
        apakah_aktif=True,
    )
    db.add(pengguna)
    await db.flush()

    psikolog.id_pengguna = pengguna.id
    psikolog.id_admin = admin_profile.id_admin if admin_profile else None
    psikolog.status_akun = "terverifikasi"
    psikolog.apakah_sudah_ganti_password = False

    await db.commit()
    await db.refresh(psikolog)
    return psikolog


async def reject_psikolog(
    db: AsyncSession,
    id_psikolog: int,
    alasan: str,
) -> Psikolog:
    result = await db.execute(select(Psikolog).where(Psikolog.id_psikolog == id_psikolog))
    psikolog = result.scalar_one_or_none()
    if psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data psikolog tidak ditemukan",
        )

    if psikolog.status_akun == "terverifikasi":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Akun psikolog sudah terverifikasi",
        )

    psikolog.status_akun = "ditolak"
    await db.commit()
    await db.refresh(psikolog)

    if psikolog.email:
        try:
            await send_psikolog_rejection_email(
                recipient_email=psikolog.email.lower(),
                nama_lengkap=psikolog.nama_lengkap,
                alasan=alasan,
            )
        except EmailServiceError:
            pass

    return psikolog
