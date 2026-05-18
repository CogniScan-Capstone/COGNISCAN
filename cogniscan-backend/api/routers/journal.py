from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies.auth import require_role
from api.dependencies.database import get_db
from api.models.pengguna import Pengguna
from api.schemas.journal import (
    CrisisContactResponse,
    JournalAnswerResponse,
    JournalAnswerSubmit,
    JournalFinalizeResponse,
    JournalSessionResponse,
    JournalSessionStart,
)
from api.services.journal_service import (
    CRISIS_CONTACTS,
    finalize_journal_session,
    get_journal_session,
    start_journal_session,
    submit_journal_answer,
)

router = APIRouter()


@router.post(
    "/sessions/start",
    response_model=JournalSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_session(
    payload: JournalSessionStart,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """
    Membuat sesi guided journaling untuk pasien login.

    Consent pemrosesan AI wajib diberikan di awal sesi dan dicatat ke
    `log_persetujuan`.
    """
    return await start_journal_session(
        db=db,
        current_user=current_user,
        payload=payload,
    )


@router.post(
    "/sessions/{id_sesi_jurnal}/answers",
    response_model=JournalAnswerResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_answer(
    id_sesi_jurnal: int,
    payload: JournalAnswerSubmit,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Simpan atau update jawaban pasien untuk satu pertanyaan."""
    return await submit_journal_answer(
        db=db,
        current_user=current_user,
        id_sesi_jurnal=id_sesi_jurnal,
        payload=payload,
    )


@router.get(
    "/sessions/{id_sesi_jurnal}",
    response_model=JournalSessionResponse,
)
async def read_session(
    id_sesi_jurnal: int,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """Ambil progress sesi journal milik pasien login."""
    return await get_journal_session(
        db=db,
        current_user=current_user,
        id_sesi_jurnal=id_sesi_jurnal,
    )


@router.post(
    "/sessions/{id_sesi_jurnal}/finalize",
    response_model=JournalFinalizeResponse,
)
async def finalize_session(
    id_sesi_jurnal: int,
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """
    Finalisasi journal, jalankan analyzer, dan simpan pra-asesmen.

    Jika hasil analyzer masuk kategori critical/perlu eskalasi, response akan
    membawa crisis contacts agar frontend bisa menampilkan bantuan segera.
    """
    session, pra_asesmen, is_crisis = await finalize_journal_session(
        db=db,
        current_user=current_user,
        id_sesi_jurnal=id_sesi_jurnal,
    )

    return JournalFinalizeResponse(
        session=session,
        pra_asesmen=pra_asesmen,
        is_crisis=is_crisis,
        message=(
            "Hasil screening perlu eskalasi segera."
            if is_crisis
            else "Screening selesai dan menunggu review psikolog."
        ),
        crisis_contacts=[
            CrisisContactResponse(**contact) for contact in CRISIS_CONTACTS
        ]
        if is_crisis
        else [],
    )
