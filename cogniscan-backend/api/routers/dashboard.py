from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import get_current_active_pasien, get_current_active_psikolog, require_role
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.dashboard import (
    AdminDashboardSummaryResponse,
    PatientDashboardSummaryResponse,
    PsikologDashboardSummaryResponse,
)
from api.services.dashboard_service import (
    get_admin_dashboard_summary,
    get_patient_dashboard_summary,
    get_psikolog_dashboard_summary,
)

router = APIRouter()


@router.get(
    "/pasien/summary",
    response_model=PatientDashboardSummaryResponse,
)
async def read_patient_dashboard_summary(
    current_user: Pengguna = Depends(get_current_active_pasien),
    db: AsyncSession = Depends(get_db),
):
    """Ringkasan angka dashboard pasien login."""
    return await get_patient_dashboard_summary(db=db, current_user=current_user)


@router.get(
    "/psikolog/summary",
    response_model=PsikologDashboardSummaryResponse,
)
async def read_psikolog_dashboard_summary(
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Ringkasan angka dashboard psikolog login."""
    return await get_psikolog_dashboard_summary(db=db, current_user=current_user)


@router.get(
    "/admin/summary",
    response_model=AdminDashboardSummaryResponse,
)
async def read_admin_dashboard_summary(
    current_user: Pengguna = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    """Ringkasan angka dashboard admin dari database aktif."""
    return await get_admin_dashboard_summary(db=db, current_user=current_user)
