from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_role
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.dashboard import PatientDashboardSummaryResponse
from api.services.dashboard_service import get_patient_dashboard_summary

router = APIRouter()


@router.get(
    "/pasien/summary",
    response_model=PatientDashboardSummaryResponse,
)
async def read_patient_dashboard_summary(
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Ringkasan angka dashboard pasien login."""
    return await get_patient_dashboard_summary(db=db, current_user=current_user)
