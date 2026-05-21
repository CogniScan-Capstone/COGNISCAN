from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.jawaban_jurnal import JawabanJurnal
from api.models.log_persetujuan import LogPersetujuan
from api.models.pasien import Pasien
from api.models.pengguna import Pengguna
from api.models.pra_asesmen import PraAsesmen
from api.models.sesi_jurnal import SesiJurnal
from api.schemas.journal import (
    JournalAnswerSubmit,
    JournalSessionResponse,
    JournalSessionStart,
)
from api.services.analyzer_service import analyze_narrative_for_pre_assessment
from api.services.pre_assessment_service import create_pre_assessment_from_analysis
from api.services.voice_note_service import (
    VoiceNoteProcessingError,
    VoiceNoteProcessingResult,
    process_voice_note_audio,
)


CRISIS_CONTACTS = [
    {
        "name": "Halo Kemenkes",
        "type": "hotline",
        "phone": "119 ext 8",
        "note": "Kontak bantuan kesehatan jiwa darurat di Indonesia.",
    },
    {
        "name": "Yayasan Pulih",
        "type": "ngo",
        "phone": None,
        "note": "Dukungan psikososial dan rujukan profesional.",
    },
    {
        "name": "Into The Light Indonesia",
        "type": "ngo",
        "phone": None,
        "note": "Edukasi dan sumber daya pencegahan bunuh diri.",
    },
]


def _is_crisis_pre_assessment(pra_asesmen: PraAsesmen) -> bool:
    return (
        pra_asesmen.indikator_urgensi == "critical"
        or pra_asesmen.status_validasi == "perlu_eskalasi"
    )


async def _get_pasien_for_user(db: AsyncSession, current_user: Pengguna) -> Pasien:
    if current_user.peran != "pasien":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint ini hanya untuk pasien",
        )

    result = await db.execute(
        select(Pasien).where(Pasien.id_pengguna == current_user.id)
    )
    pasien = result.scalar_one_or_none()
    if pasien is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil pasien tidak ditemukan",
        )

    return pasien


async def _get_owned_session(
    db: AsyncSession,
    current_user: Pengguna,
    id_sesi_jurnal: int,
    *,
    include_answers: bool = False,
    include_pre_assessment: bool = False,
) -> SesiJurnal:
    pasien = await _get_pasien_for_user(db=db, current_user=current_user)
    query = select(SesiJurnal).where(
        SesiJurnal.id_sesi_jurnal == id_sesi_jurnal,
        SesiJurnal.id_pasien == pasien.id_pasien,
    )

    options = []
    if include_answers:
        options.append(selectinload(SesiJurnal.jawaban))
    if include_pre_assessment:
        options.append(
            selectinload(SesiJurnal.pra_asesmen).selectinload(
                PraAsesmen.distorsi_terdeteksi
            )
        )
    if options:
        query = query.options(*options)

    result = await db.execute(query)
    sesi_jurnal = result.scalar_one_or_none()
    if sesi_jurnal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesi jurnal tidak ditemukan",
        )

    return sesi_jurnal


async def start_journal_session(
    db: AsyncSession,
    current_user: Pengguna,
    payload: JournalSessionStart,
) -> JournalSessionResponse:
    if not payload.consent_ai_processing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Persetujuan pemrosesan AI wajib diberikan sebelum screening",
        )

    pasien = await _get_pasien_for_user(db=db, current_user=current_user)
    db.add(LogPersetujuan(id_pengguna=current_user.id, apakah_setuju=True))

    sesi_jurnal = SesiJurnal(
        id_pasien=pasien.id_pasien,
        konteks_pemicu=payload.konteks_pemicu,
        total_pertanyaan=payload.total_pertanyaan,
        status="sedang_berjalan",
    )
    db.add(sesi_jurnal)
    await db.commit()
    await db.refresh(sesi_jurnal)
    return JournalSessionResponse(
        id_sesi_jurnal=sesi_jurnal.id_sesi_jurnal,
        id_pasien=sesi_jurnal.id_pasien,
        konteks_pemicu=sesi_jurnal.konteks_pemicu,
        total_pertanyaan=sesi_jurnal.total_pertanyaan,
        status=sesi_jurnal.status,
        dimulai_pada=sesi_jurnal.dimulai_pada,
        diselesaikan_pada=sesi_jurnal.diselesaikan_pada,
        jawaban=[],
    )


async def _ensure_ai_processing_consent(
    db: AsyncSession,
    current_user: Pengguna,
) -> None:
    consent_result = await db.execute(
        select(LogPersetujuan).where(
            LogPersetujuan.id_pengguna == current_user.id,
            LogPersetujuan.apakah_setuju.is_(True),
        )
    )
    if consent_result.scalars().first() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Persetujuan pemrosesan AI belum tercatat",
        )


async def submit_journal_answer(
    db: AsyncSession,
    current_user: Pengguna,
    id_sesi_jurnal: int,
    payload: JournalAnswerSubmit,
) -> JawabanJurnal:
    sesi_jurnal = await _get_owned_session(
        db=db,
        current_user=current_user,
        id_sesi_jurnal=id_sesi_jurnal,
    )

    if sesi_jurnal.status != "sedang_berjalan":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sesi jurnal sudah tidak bisa diubah",
        )

    total_pertanyaan = sesi_jurnal.total_pertanyaan or 0
    if total_pertanyaan and payload.urutan_pertanyaan > total_pertanyaan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Urutan pertanyaan melebihi total pertanyaan sesi",
        )

    existing_result = await db.execute(
        select(JawabanJurnal).where(
            JawabanJurnal.id_sesi_jurnal == sesi_jurnal.id_sesi_jurnal,
            JawabanJurnal.urutan_pertanyaan == payload.urutan_pertanyaan,
        )
    )
    jawaban = existing_result.scalar_one_or_none()

    if jawaban is None:
        jawaban = JawabanJurnal(
            id_sesi_jurnal=sesi_jurnal.id_sesi_jurnal,
            urutan_pertanyaan=payload.urutan_pertanyaan,
        )
        db.add(jawaban)

    jawaban.teks_pertanyaan = payload.teks_pertanyaan
    jawaban.teks_jawaban = payload.teks_jawaban

    await db.commit()
    await db.refresh(jawaban)
    return jawaban


async def submit_voice_journal_answer(
    db: AsyncSession,
    current_user: Pengguna,
    id_sesi_jurnal: int,
    *,
    urutan_pertanyaan: int,
    teks_pertanyaan: str,
    audio_bytes: bytes,
    mime_type: str | None,
) -> tuple[JawabanJurnal, VoiceNoteProcessingResult]:
    sesi_jurnal = await _get_owned_session(
        db=db,
        current_user=current_user,
        id_sesi_jurnal=id_sesi_jurnal,
    )

    if sesi_jurnal.status != "sedang_berjalan":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sesi jurnal sudah tidak bisa diubah",
        )

    total_pertanyaan = sesi_jurnal.total_pertanyaan or 0
    if total_pertanyaan and urutan_pertanyaan > total_pertanyaan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Urutan pertanyaan melebihi total pertanyaan sesi",
        )

    await _ensure_ai_processing_consent(db=db, current_user=current_user)

    try:
        voice_result = await process_voice_note_audio(
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            question=teks_pertanyaan,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except VoiceNoteProcessingError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    teks_jawaban = voice_result.as_journal_answer_text()
    if not teks_jawaban.strip():
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Voice note tidak menghasilkan ringkasan yang bisa disimpan",
        )

    payload = JournalAnswerSubmit(
        urutan_pertanyaan=urutan_pertanyaan,
        teks_pertanyaan=teks_pertanyaan,
        teks_jawaban=teks_jawaban,
    )
    jawaban = await submit_journal_answer(
        db=db,
        current_user=current_user,
        id_sesi_jurnal=id_sesi_jurnal,
        payload=payload,
    )
    return jawaban, voice_result


async def get_journal_session(
    db: AsyncSession,
    current_user: Pengguna,
    id_sesi_jurnal: int,
) -> SesiJurnal:
    return await _get_owned_session(
        db=db,
        current_user=current_user,
        id_sesi_jurnal=id_sesi_jurnal,
        include_answers=True,
        include_pre_assessment=True,
    )


async def finalize_journal_session(
    db: AsyncSession,
    current_user: Pengguna,
    id_sesi_jurnal: int,
) -> tuple[SesiJurnal, PraAsesmen, bool]:
    sesi_jurnal = await _get_owned_session(
        db=db,
        current_user=current_user,
        id_sesi_jurnal=id_sesi_jurnal,
        include_answers=True,
    )

    if sesi_jurnal.status == "selesai":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sesi jurnal sudah selesai",
        )
    if sesi_jurnal.status != "sedang_berjalan":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sesi jurnal tidak dapat difinalisasi",
        )

    total_pertanyaan = sesi_jurnal.total_pertanyaan or 0
    answered_questions = {
        answer.urutan_pertanyaan
        for answer in sesi_jurnal.jawaban
        if answer.urutan_pertanyaan is not None and (answer.teks_jawaban or "").strip()
    }

    if total_pertanyaan:
        missing_questions = [
            order
            for order in range(1, total_pertanyaan + 1)
            if order not in answered_questions
        ]
        if missing_questions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Jawaban belum lengkap untuk pertanyaan: {missing_questions}",
            )
    elif not answered_questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimal satu jawaban wajib diisi sebelum finalize",
        )

    await _ensure_ai_processing_consent(db=db, current_user=current_user)

    ordered_answers = sorted(
        sesi_jurnal.jawaban,
        key=lambda answer: answer.urutan_pertanyaan or 0,
    )
    narrative = "\n\n".join(
        f"Pertanyaan {answer.urutan_pertanyaan}: {answer.teks_pertanyaan}\n"
        f"Jawaban: {answer.teks_jawaban}"
        for answer in ordered_answers
        if (answer.teks_jawaban or "").strip()
    )

    analysis = await analyze_narrative_for_pre_assessment(narrative)
    sesi_jurnal.status = "selesai"
    sesi_jurnal.diselesaikan_pada = datetime.now(timezone.utc)

    pra_asesmen = await create_pre_assessment_from_analysis(
        db=db,
        id_sesi_jurnal=sesi_jurnal.id_sesi_jurnal,
        analysis=analysis,
    )

    refreshed_session = await _get_owned_session(
        db=db,
        current_user=current_user,
        id_sesi_jurnal=id_sesi_jurnal,
        include_answers=True,
        include_pre_assessment=True,
    )
    refreshed_pre_assessment = refreshed_session.pra_asesmen or pra_asesmen
    return (
        refreshed_session,
        refreshed_pre_assessment,
        _is_crisis_pre_assessment(refreshed_pre_assessment),
    )
