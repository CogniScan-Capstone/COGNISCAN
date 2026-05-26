from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import get_current_active_psikolog
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.konsultasi import (
    ConsultationResultCreate,
    ConsultationResultResponse,
)
from api.services.konsultasi_service import submit_consultation_result


router = APIRouter()


@router.post(
    "/{id_pemesanan_konsultasi}/hasil",
    response_model=ConsultationResultResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_consultation_result(
    id_pemesanan_konsultasi: int,
    payload: ConsultationResultCreate,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Simpan hasil konsultasi dan tutup status sesi oleh psikolog."""
    return await submit_consultation_result(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
        payload=payload,
    )
