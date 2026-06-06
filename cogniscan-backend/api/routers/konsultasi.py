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
from api.services.audit_log_service import record_audit_log


router = APIRouter()


@router.get(
    "/pasien/{id_pasien}/riwayat",
    response_model=PatientConsultationHistoryResponse,
)
async def read_patient_consultation_history(
    id_pasien: int,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Ambil riwayat konsultasi pasien yang pernah ditangani psikolog login."""
    history = await list_psikolog_patient_consultation_history(
        db=db,
        current_user=current_user,
        id_pasien=id_pasien,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_view_patient_consultation_history",
        target_type="pasien",
        target_id=id_pasien,
        request=request,
        metadata={"total_konsultasi": history.total_konsultasi},
        commit=True,
    )
    return history


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
    result = await submit_consultation_result(
        db=db,
        current_user=current_user,
        id_pemesanan_konsultasi=id_pemesanan_konsultasi,
        payload=payload,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_submit_consultation_result",
        target_type="pemesanan_konsultasi",
        target_id=id_pemesanan_konsultasi,
        request=request,
        metadata={
            "id_hasil_konsultasi": result.id_hasil_konsultasi,
            "pasien_hadir": result.pasien_hadir,
            "perlu_sesi_lanjutan": result.perlu_sesi_lanjutan,
            "status_konsultasi": result.status_konsultasi,
        },
        commit=True,
    )
    return result
