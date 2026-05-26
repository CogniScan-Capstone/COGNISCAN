from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
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
    get_psikolog_by_id,
    list_psikolog_by_status,
    reject_psikolog,
    reset_psikolog_temporary_password,
)
from api.services.psikolog_document_service import resolve_psikolog_document

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


@router.get(
    "/psikolog/{id_psikolog}",
    response_model=PsikologAdminResponse,
)
async def get_psikolog_verification_detail(
    id_psikolog: int,
    _admin: Pengguna = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db),
):
    """Detail data psikolog untuk review admin."""
    return await get_psikolog_by_id(db=db, id_psikolog=id_psikolog)


@router.get("/psikolog/{id_psikolog}/documents/{document_type}")
async def get_psikolog_verification_document(
    id_psikolog: int,
    document_type: str,
    _admin: Pengguna = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db),
):
    """Preview dokumen STR/SIP psikolog untuk admin terautentikasi."""
    if document_type not in {"str", "sip"}:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Jenis dokumen tidak ditemukan",
        )

    psikolog = await get_psikolog_by_id(db=db, id_psikolog=id_psikolog)
    relative_path = (
        psikolog.upload_dokumen_str
        if document_type == "str"
        else psikolog.upload_dokumen_sip
    )
    document_path = resolve_psikolog_document(relative_path)
    if document_path is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File dokumen belum tersedia di server",
        )

    response = FileResponse(document_path, media_type="application/pdf")
    response.headers["Content-Disposition"] = (
        f'inline; filename="{document_path.name}"'
    )
    return response


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
    "/psikolog/{id_psikolog}/reset-temporary-password",
    response_model=PsikologApproveResponse,
    status_code=status.HTTP_200_OK,
)
async def reset_psikolog_temporary_password_route(
    id_psikolog: int,
    _admin: Pengguna = Depends(get_current_active_admin),
    db: AsyncSession = Depends(get_db),
):
    """Reset dan kirim ulang temporary password psikolog."""
    psikolog = await reset_psikolog_temporary_password(
        db=db,
        id_psikolog=id_psikolog,
    )
    return PsikologApproveResponse(
        id_psikolog=psikolog.id_psikolog,
        email=psikolog.email or "",
        status_akun=psikolog.status_akun or "terverifikasi",
        apakah_sudah_ganti_password=bool(psikolog.apakah_sudah_ganti_password),
        message="Temporary password baru dikirim lewat email",
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
