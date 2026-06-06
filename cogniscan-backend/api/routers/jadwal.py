from datetime import date

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.core.config import settings
from api.core.rate_limit import limiter
from api.dependencies.auth import get_current_active_psikolog
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
from api.services.audit_log_service import record_audit_log

router = APIRouter()


@router.get(
    "/psikolog/availability",
    response_model=list[PsikologAvailabilityResponse],
)
async def read_psikolog_availability(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: Pengguna = Depends(get_current_active_psikolog),
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
@limiter.limit(settings.RATE_LIMIT_SCHEDULE_MUTATION)
async def create_psikolog_availability_slot(
    payload: PsikologAvailabilityCreate,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Buat satu slot availability psikolog."""
    slot = await create_psikolog_availability(
        db=db,
        current_user=current_user,
        payload=payload,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_create_availability_slot",
        target_type="jadwal_psikolog",
        target_id=slot.id_jadwal_psikolog,
        request=request,
        metadata={
            "tanggal_praktik": slot.tanggal_praktik,
            "waktu_mulai": slot.waktu_mulai,
            "waktu_selesai": slot.waktu_selesai,
        },
        commit=True,
    )
    return slot


@router.post(
    "/psikolog/availability/bulk",
    response_model=PsikologAvailabilityBulkCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit(settings.RATE_LIMIT_SCHEDULE_MUTATION)
async def create_psikolog_availability_slots_bulk(
    payload: PsikologAvailabilityBulkCreate,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Buat banyak slot availability dalam rentang tanggal tertentu."""
    result = await create_psikolog_availability_bulk(
        db=db,
        current_user=current_user,
        payload=payload,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_create_availability_slots_bulk",
        target_type="jadwal_psikolog",
        request=request,
        metadata={
            "start_date": payload.start_date,
            "end_date": payload.end_date,
            "weekdays": payload.weekdays,
            "requested_slots": len(payload.slots),
            "created_count": result.created_count,
            "skipped_count": result.skipped_count,
        },
        commit=True,
    )
    return result


@router.patch(
    "/psikolog/availability/{id_jadwal_psikolog}",
    response_model=PsikologAvailabilityResponse,
)
@limiter.limit(settings.RATE_LIMIT_SCHEDULE_MUTATION)
async def update_psikolog_availability_slot(
    id_jadwal_psikolog: int,
    payload: PsikologAvailabilityUpdate,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Ubah slot availability psikolog jika belum memiliki booking aktif."""
    slot = await update_psikolog_availability(
        db=db,
        current_user=current_user,
        id_jadwal_psikolog=id_jadwal_psikolog,
        payload=payload,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_update_availability_slot",
        target_type="jadwal_psikolog",
        target_id=id_jadwal_psikolog,
        request=request,
        metadata={
            "tanggal_praktik": slot.tanggal_praktik,
            "waktu_mulai": slot.waktu_mulai,
            "waktu_selesai": slot.waktu_selesai,
            "apakah_tersedia": slot.apakah_tersedia,
        },
        commit=True,
    )
    return slot


@router.delete(
    "/psikolog/availability/{id_jadwal_psikolog}",
    response_model=PsikologAvailabilityDeleteResponse,
)
@limiter.limit(settings.RATE_LIMIT_SCHEDULE_MUTATION)
async def delete_psikolog_availability_slot(
    id_jadwal_psikolog: int,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Hapus slot availability yang belum memiliki booking aktif."""
    result = await delete_psikolog_availability(
        db=db,
        current_user=current_user,
        id_jadwal_psikolog=id_jadwal_psikolog,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_delete_availability_slot",
        target_type="jadwal_psikolog",
        target_id=id_jadwal_psikolog,
        request=request,
        commit=True,
    )
    return result


@router.get(
    "/psikolog/reschedule-requests",
    response_model=list[BookingRescheduleRequestResponse],
)
async def read_psikolog_reschedule_requests(
    request_status: str | None = Query(default="pending", alias="status"),
    current_user: Pengguna = Depends(get_current_active_psikolog),
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
@limiter.limit(settings.RATE_LIMIT_SCHEDULE_MUTATION)
async def approve_reschedule_request(
    id_permintaan_reschedule: int,
    payload: BookingRescheduleDecisionRequest,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Setujui pengajuan reschedule agar pasien bisa memilih slot baru."""
    result = await approve_psikolog_reschedule_request(
        db=db,
        current_user=current_user,
        id_permintaan_reschedule=id_permintaan_reschedule,
        payload=payload,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_approve_reschedule_request",
        target_type="permintaan_reschedule_konsultasi",
        target_id=id_permintaan_reschedule,
        request=request,
        metadata={
            "id_pemesanan_konsultasi": result.id_pemesanan_konsultasi,
            "id_pasien": result.id_pasien,
            "status": result.status,
            "has_note": bool(payload.catatan_psikolog),
        },
        commit=True,
    )
    return result


@router.post(
    "/psikolog/reschedule-requests/{id_permintaan_reschedule}/reject",
    response_model=BookingRescheduleRequestResponse,
)
@limiter.limit(settings.RATE_LIMIT_SCHEDULE_MUTATION)
async def reject_reschedule_request(
    id_permintaan_reschedule: int,
    payload: BookingRescheduleRejectRequest,
    request: Request,
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Tolak pengajuan reschedule dengan catatan untuk pasien."""
    result = await reject_psikolog_reschedule_request(
        db=db,
        current_user=current_user,
        id_permintaan_reschedule=id_permintaan_reschedule,
        payload=payload,
    )
    await record_audit_log(
        db,
        actor=current_user,
        action="psikolog_reject_reschedule_request",
        target_type="permintaan_reschedule_konsultasi",
        target_id=id_permintaan_reschedule,
        request=request,
        metadata={
            "id_pemesanan_konsultasi": result.id_pemesanan_konsultasi,
            "id_pasien": result.id_pasien,
            "status": result.status,
            "note_length": len(payload.catatan_psikolog.strip()),
        },
        commit=True,
    )
    return result


@router.get(
    "/psikolog/bookings",
    response_model=list[PsikologScheduleBookingResponse],
)
async def read_psikolog_schedule_bookings(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    current_user: Pengguna = Depends(get_current_active_psikolog),
    db: AsyncSession = Depends(get_db),
):
    """Ambil jadwal konsultasi berbayar/terkonfirmasi milik psikolog login."""
    return await list_psikolog_paid_schedule_bookings(
        db=db,
        current_user=current_user,
        start_date=start_date,
        end_date=end_date,
    )
