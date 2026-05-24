from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_role
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.booking import (
    BookingRescheduleDecisionRequest,
    BookingRescheduleRejectRequest,
    BookingRescheduleRequestResponse,
)
from api.schemas.jadwal import (
    PsikologAvailabilityBulkCreate,
    PsikologAvailabilityBulkCreateResponse,
    PsikologAvailabilityCreate,
    PsikologAvailabilityDeleteResponse,
    PsikologAvailabilityResponse,
    PsikologAvailabilityUpdate,
    PsikologScheduleBookingResponse,
)
from api.services.booking_service import (
    approve_psikolog_reschedule_request,
    list_psikolog_reschedule_requests,
    reject_psikolog_reschedule_request,
)
from api.services.jadwal_service import (
    create_psikolog_availability,
    create_psikolog_availability_bulk,
    delete_psikolog_availability,
    list_psikolog_availability,
    list_psikolog_paid_schedule_bookings,
    update_psikolog_availability,
)

router = APIRouter()


@router.get(
    "/psikolog/availability",
    response_model=list[PsikologAvailabilityResponse],
)
async def read_psikolog_availability(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Ambil slot availability milik psikolog login."""
    return await list_psikolog_availability(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
    )


@router.post(
    "/psikolog/availability",
    response_model=PsikologAvailabilityResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_psikolog_availability_slot(
    payload: PsikologAvailabilityCreate,
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Buat satu slot availability psikolog."""
    return await create_psikolog_availability(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.post(
    "/psikolog/availability/bulk",
    response_model=PsikologAvailabilityBulkCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_psikolog_availability_slots_bulk(
    payload: PsikologAvailabilityBulkCreate,
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Buat banyak slot availability dalam rentang tanggal tertentu."""
    return await create_psikolog_availability_bulk(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.patch(
    "/psikolog/availability/{id_jadwal_psikolog}",
    response_model=PsikologAvailabilityResponse,
)
async def update_psikolog_availability_slot(
    id_jadwal_psikolog: int,
    payload: PsikologAvailabilityUpdate,
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Ubah slot availability psikolog jika belum memiliki booking aktif."""
    return await update_psikolog_availability(
        db=db,
        current_user=current_user,
        id_jadwal_psikolog=id_jadwal_psikolog,
        payload=payload,
    )


@router.delete(
    "/psikolog/availability/{id_jadwal_psikolog}",
    response_model=PsikologAvailabilityDeleteResponse,
)
async def delete_psikolog_availability_slot(
    id_jadwal_psikolog: int,
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Hapus slot availability yang belum memiliki booking aktif."""
    return await delete_psikolog_availability(
        db=db,
        current_user=current_user,
        id_jadwal_psikolog=id_jadwal_psikolog,
    )


@router.get(
    "/psikolog/reschedule-requests",
    response_model=list[BookingRescheduleRequestResponse],
)
async def read_psikolog_reschedule_requests(
    request_status: str | None = Query(default="pending", alias="status"),
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Ambil pengajuan reschedule pasien untuk psikolog login."""
    return await list_psikolog_reschedule_requests(
        db=db,
        current_user=current_user,
        request_status=request_status,
    )


@router.post(
    "/psikolog/reschedule-requests/{id_permintaan_reschedule}/approve",
    response_model=BookingRescheduleRequestResponse,
)
async def approve_reschedule_request(
    id_permintaan_reschedule: int,
    payload: BookingRescheduleDecisionRequest,
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Setujui pengajuan reschedule agar pasien bisa memilih slot baru."""
    return await approve_psikolog_reschedule_request(
        db=db,
        current_user=current_user,
        id_permintaan_reschedule=id_permintaan_reschedule,
        payload=payload,
    )


@router.post(
    "/psikolog/reschedule-requests/{id_permintaan_reschedule}/reject",
    response_model=BookingRescheduleRequestResponse,
)
async def reject_reschedule_request(
    id_permintaan_reschedule: int,
    payload: BookingRescheduleRejectRequest,
    current_user: Pengguna = Depends(require_role("psikolog")),
    db: AsyncSession = Depends(get_db),
):
    """Tolak pengajuan reschedule dengan catatan untuk pasien."""
    return await reject_psikolog_reschedule_request(
        db=db,
        current_user=current_user,
        id_permintaan_reschedule=id_permintaan_reschedule,
        payload=payload,
    )


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
