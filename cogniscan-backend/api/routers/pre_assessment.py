from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import get_current_active_pasien, get_current_active_psikolog
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.pre_assessment import (
    PraAsesmenAssignPsikologRequest,
    PraAsesmenFeedbackDraftRequest,
    PraAsesmenPasienResponse,
    PraAsesmenPsikologResponse,
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
    save_pre_assessment_feedback_draft,
    submit_pre_assessment_feedback,
)
from api.services.audit_log_service import record_audit_log

router = APIRouter()


@router.get(
    "/psikolog/available",
    response_model=list[PsikologAvailableResponse],
)
async def read_available_psikolog(
    _current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """List psikolog terverifikasi yang siap menerima tindak lanjut pasien."""
    return await list_available_psikolog(db=db)


@router.get(
    "/reports",
    response_model=list[PraAsesmenPasienResponse],
)
async def read_patient_pre_assessments(
    current_user: Pengguna = Depends(get_current_active_pasien),
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
    request: Request,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Ambil hasil pra-asesmen milik pasien login."""
    pra_asesmen = await get_patient_pre_assessment(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="patient_view_pre_assessment",
        target_type="pra_asesmen",
        target_id=id_pra_asesmen,
        request=request,
        commit=True,
    )
    return pra_asesmen


@router.patch(
    "/reports/{id_pra_asesmen}/assign-psikolog",
    response_model=PraAsesmenPasienResponse,
)
async def assign_patient_pre_assessment_psikolog(
    id_pra_asesmen: int,
    payload: PraAsesmenAssignPsikologRequest,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Simpan psikolog pilihan pasien untuk review hasil pra-asesmen."""
    pra_asesmen = await assign_psikolog_to_pre_assessment(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
        id_psikolog=payload.id_psikolog,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="patient_assign_psikolog_to_pre_assessment",
        target_type="pra_asesmen",
        target_id=id_pra_asesmen,
        request=request,
        metadata={"id_psikolog": payload.id_psikolog},
        commit=True,
    )
    return pra_asesmen


@router.get(
    "/psikolog/reports",
    response_model=list[PraAsesmenPsikologResponse],
)
async def read_psikolog_pre_assessments(
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Ambil semua hasil pra-asesmen yang ditugaskan ke psikolog login."""
    return await list_psikolog_pre_assessments(db=db, current_user=current_user)


@router.get(
    "/psikolog/reports/{id_pra_asesmen}",
    response_model=PraAsesmenPsikologResponse,
)
async def read_psikolog_pre_assessment(
    id_pra_asesmen: int,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Ambil detail pra-asesmen yang ditugaskan ke psikolog login."""
    pra_asesmen = await get_psikolog_pre_assessment(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_view_pre_assessment",
        target_type="pra_asesmen",
        target_id=id_pra_asesmen,
        request=request,
        metadata={"id_pasien": pra_asesmen.sesi_jurnal.id_pasien if pra_asesmen.sesi_jurnal else None},
        commit=True,
    )
    return pra_asesmen


@router.patch(
    "/psikolog/reports/{id_pra_asesmen}/draft",
    response_model=PraAsesmenPsikologResponse,
)
async def draft_patient_pre_assessment_feedback(
    id_pra_asesmen: int,
    payload: PraAsesmenFeedbackDraftRequest,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Simpan draft feedback psikolog tanpa menampilkannya ke pasien."""
    pra_asesmen = await save_pre_assessment_feedback_draft(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
        draft_feedback_psikolog=payload.draft_feedback_psikolog,
        draft_catatan_internal=payload.draft_catatan_internal,
        draft_akurasi_ai=payload.draft_akurasi_ai,
        draft_severity_final=payload.draft_severity_final,
        draft_rekomendasi_tindak_lanjut=payload.draft_rekomendasi_tindak_lanjut,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_save_pre_assessment_feedback_draft",
        target_type="pra_asesmen",
        target_id=id_pra_asesmen,
        request=request,
        metadata={
            "has_feedback_draft": bool(payload.draft_feedback_psikolog),
            "has_internal_note_draft": bool(payload.draft_catatan_internal),
        },
        commit=True,
    )
    return pra_asesmen


@router.patch(
    "/psikolog/reports/{id_pra_asesmen}/feedback",
    response_model=PraAsesmenPsikologResponse,
)
async def feedback_patient_pre_assessment(
    id_pra_asesmen: int,
    payload: PraAsesmenFeedbackRequest,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Simpan feedback psikolog pada hasil pra-asesmen pasien."""
    pra_asesmen = await submit_pre_assessment_feedback(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
        feedback_psikolog=payload.feedback_psikolog,
        status_validasi=payload.status_validasi,
        catatan_internal_psikolog=payload.catatan_internal_psikolog,
        akurasi_ai_psikolog=payload.akurasi_ai_psikolog,
        severity_final_psikolog=payload.severity_final_psikolog,
        rekomendasi_tindak_lanjut_psikolog=payload.rekomendasi_tindak_lanjut_psikolog,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_submit_pre_assessment_feedback",
        target_type="pra_asesmen",
        target_id=id_pra_asesmen,
        request=request,
        metadata={
            "status_validasi": payload.status_validasi,
            "severity_final": payload.severity_final_psikolog,
            "feedback_length": len(payload.feedback_psikolog.strip()),
        },
        commit=True,
    )
    return pra_asesmen
