from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import get_current_active_admin
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.admin import (
    PsikologAdminResponse,
    PsikologApproveResponse,
    PsikologRejectRequest,
    PsikologRejectResponse,
)
from api.services.admin_service import (
    approve_psikolog,
    list_psikolog_by_status,
    reject_psikolog,
)

router = APIRouter()


@router.get(
    "/psikolog",
    response_model=list[PsikologAdminResponse],
)
async def list_psikolog_verification(
    status_akun: Optional[str] = Query(default="pending"),
    _admin: Pengguna = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db),
):
    """List data psikolog untuk review admin."""
    return await list_psikolog_by_status(db=db, status_akun=status_akun)


@router.post(
    "/psikolog/{id_psikolog}/approve",
    response_model=PsikologApproveResponse,
    status_code=status.HTTP_200_OK,
)
async def approve_psikolog_verification(
    id_psikolog: int,
    current_admin: Pengguna = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Approve psikolog, buat akun Supabase Auth, dan kirim temporary password.
    """
    psikolog = await approve_psikolog(
        db=db,
        id_psikolog=id_psikolog,
        current_admin=current_admin,
    )
    return PsikologApproveResponse(
        id_psikolog=psikolog.id_psikolog,
        email=psikolog.email or "",
        status_akun=psikolog.status_akun or "terverifikasi",
        apakah_sudah_ganti_password=bool(psikolog.apakah_sudah_ganti_password),
        message="Akun psikolog diverifikasi dan temporary password dikirim lewat email",
    )


@router.post(
    "/psikolog/{id_psikolog}/reject",
    response_model=PsikologRejectResponse,
    status_code=status.HTTP_200_OK,
)
async def reject_psikolog_verification(
    id_psikolog: int,
    payload: PsikologRejectRequest,
    _admin: Pengguna = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db),
):
    """Tolak verifikasi psikolog dan kirim email penolakan jika SMTP aktif."""
    psikolog = await reject_psikolog(
        db=db,
        id_psikolog=id_psikolog,
        alasan=payload.alasan,
    )
    return PsikologRejectResponse(
        id_psikolog=psikolog.id_psikolog,
        email=psikolog.email,
        status_akun=psikolog.status_akun or "ditolak",
        message="Verifikasi psikolog ditolak",
    )
