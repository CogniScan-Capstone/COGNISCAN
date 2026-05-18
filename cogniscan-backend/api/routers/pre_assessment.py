from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_role
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.pre_assessment import (
    PraAsesmenPasienResponse,
    PsikologAvailableResponse,
)
from api.services.pre_assessment_service import (
    get_patient_pre_assessment,
    list_available_psikolog,
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
