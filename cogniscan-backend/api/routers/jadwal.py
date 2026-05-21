from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_role
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.jadwal import PsikologScheduleBookingResponse
from api.services.jadwal_service import list_psikolog_paid_schedule_bookings

router = APIRouter()


@router.get(
    "/psikolog/bookings",
    response_model=list[PsikologScheduleBookingResponse],
)
async def read_psikolog_schedule_bookings(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Ambil jadwal konsultasi berbayar/terkonfirmasi milik psikolog login."""
    return await list_psikolog_paid_schedule_bookings(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
    )
