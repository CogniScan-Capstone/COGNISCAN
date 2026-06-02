from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.config import settings
from api.core.rate_limit import limiter
from api.dependencies.auth import get_current_active_psikolog
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.konsultasi import (
    ConsultationResultCreate,
    ConsultationResultResponse,
    PatientConsultationHistoryResponse,
)
from api.services.konsultasi_service import (
    list_psikolog_patient_consultation_history,
    submit_consultation_result,
)


router = APIRouter()


@router.get(
    "/pasien/{id_pasien}/riwayat",
    response_model=PatientConsultationHistoryResponse,
)
async def read_patient_consultation_history(
    id_pasien: int,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Ambil riwayat konsultasi pasien yang pernah ditangani psikolog login."""
    return await list_psikolog_patient_consultation_history(
        db=db,
        current_user=current_user,
        id_pasien=id_pasien,
    )


@router.post(
    "/{id_pemesanan_konsultasi}/hasil",
    response_model=ConsultationResultResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(settings.RATE_LIMIT_CONSULTATION_RESULT)
async def create_consultation_result(
    id_pemesanan_konsultasi: int,
    payload: ConsultationResultCreate,
    request: Request,
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
