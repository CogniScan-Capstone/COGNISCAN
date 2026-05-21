from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
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
    JournalVoiceAnswerAcceptedResponse,
)
from api.services.journal_service import (
    CRISIS_CONTACTS,
    finalize_journal_session,
    get_journal_session,
    start_journal_session,
    submit_journal_answer,
    submit_voice_journal_answer,
)
from api.services.voice_note_service import MAX_AUDIO_BYTES

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


@router.post(
    "/sessions/{id_sesi_jurnal}/voice-answer",
    response_model=JournalVoiceAnswerAcceptedResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_voice_answer(
    id_sesi_jurnal: int,
    request: Request,
    urutan_pertanyaan: int = Query(..., ge=1),
    teks_pertanyaan: str = Query(..., min_length=3, max_length=500),
    current_user: Pengguna = Depends(require_role("pasien")),
    db: AsyncSession = Depends(get_db),
):
    """
    Proses voice note screening tanpa menyimpan audio mentah.

    Body request berisi raw audio bytes. Backend membaca payload ke memori,
    mengirimnya ke Gemini, lalu hanya menyimpan ringkasan teks ke jawaban jurnal.
    """
    content_length = request.headers.get("content-length")
    if content_length:
        try:
            if int(content_length) > MAX_AUDIO_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail="Ukuran voice note maksimal 10 MB",
                )
        except ValueError:
            pass

    audio_bytes = await request.body()
    try:
        jawaban, _voice_result = await submit_voice_journal_answer(
            db=db,
            current_user=current_user,
            id_sesi_jurnal=id_sesi_jurnal,
            urutan_pertanyaan=urutan_pertanyaan,
            teks_pertanyaan=teks_pertanyaan,
            audio_bytes=audio_bytes,
            mime_type=request.headers.get("content-type"),
        )
        return JournalVoiceAnswerAcceptedResponse.model_validate(jawaban)
    finally:
        del audio_bytes


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
