from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_role
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.pre_assessment import (
    PraAsesmenAssignPsikologRequest,
    PraAsesmenPasienResponse,
    PsikologAvailableResponse,
    PraAsesmenFeedbackRequest,
)
from api.services.pre_assessment_service import (
    assign_psikolog_to_pre_assessment,
    get_patient_pre_assessment,
    list_available_psikolog,
    list_patient_pre_assessments,
    list_psikolog_pre_assessments,
    get_psikolog_pre_assessment,
    submit_pre_assessment_feedback,
)

router = APIRouter()


@router.get(
    "/psikolog/available",
    response_model=list[PsikologAvailableResponse],
)
async def read_available_psikolog(
    _current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """List psikolog terverifikasi yang siap menerima tindak lanjut pasien."""
    return await list_available_psikolog(db=db)


@router.get(
    "/reports",
    response_model=list[PraAsesmenPasienResponse],
)
async def read_patient_pre_assessments(
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Ambil semua hasil pra-asesmen milik pasien login."""
    return await list_patient_pre_assessments(db=db, current_user=current_user)


@router.get(
    "/reports/{id_pra_asesmen}",
    response_model=PraAsesmenPasienResponse,
)
async def read_patient_pre_assessment(
    id_pra_asesmen: int,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Ambil hasil pra-asesmen milik pasien login."""
    return await get_patient_pre_assessment(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
    )


@router.patch(
    "/reports/{id_pra_asesmen}/assign-psikolog",
    response_model=PraAsesmenPasienResponse,
)
async def assign_patient_pre_assessment_psikolog(
    id_pra_asesmen: int,
    payload: PraAsesmenAssignPsikologRequest,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Simpan psikolog pilihan pasien untuk review hasil pra-asesmen."""
    return await assign_psikolog_to_pre_assessment(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
        id_psikolog=payload.id_psikolog,
    )


@router.get(
    "/psikolog/reports",
    response_model=list[PraAsesmenPasienResponse],
)
async def read_psikolog_pre_assessments(
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Ambil semua hasil pra-asesmen yang ditugaskan ke psikolog login."""
    return await list_psikolog_pre_assessments(db=db, current_user=current_user)


@router.get(
    "/psikolog/reports/{id_pra_asesmen}",
    response_model=PraAsesmenPasienResponse,
)
async def read_psikolog_pre_assessment(
    id_pra_asesmen: int,
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Ambil detail pra-asesmen yang ditugaskan ke psikolog login."""
    return await get_psikolog_pre_assessment(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
    )


@router.patch(
    "/psikolog/reports/{id_pra_asesmen}/feedback",
    response_model=PraAsesmenPasienResponse,
)
async def feedback_patient_pre_assessment(
    id_pra_asesmen: int,
    payload: PraAsesmenFeedbackRequest,
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Simpan feedback psikolog pada hasil pra-asesmen pasien."""
    return await submit_pre_assessment_feedback(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
        feedback_psikolog=payload.feedback_psikolog,
        status_validasi=payload.status_validasi,
    )
