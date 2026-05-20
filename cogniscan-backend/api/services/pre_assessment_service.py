from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.models.distorsi_terdeteksi import DistorsiTerdeteksi
from api.models.pasien import Pasien
from api.models.pengguna import Pengguna
from api.models.pra_asesmen import PraAsesmen
from api.models.psikolog import Psikolog
from api.models.sesi_jurnal import SesiJurnal
from api.services.analyzer_service import AnalyzerServiceResult


def _status_validasi_awal(analysis: AnalyzerServiceResult) -> str:
    """
    Critical/crisis case harus masuk jalur eskalasi, bukan validasi normal.
    """
    if (
        analysis.indikator_urgensi == "critical"
        or analysis.requires_immediate_attention
        or analysis.has_self_harm_indicator
    ):
        return "perlu_eskalasi"
    return "menunggu"


async def create_pre_assessment_from_analysis(
    db: AsyncSession,
    id_sesi_jurnal: int,
    analysis: AnalyzerServiceResult,
    id_psikolog: int | None = None,
) -> PraAsesmen:
    """
    Simpan hasil analyzer ke tabel `pra_asesmen` dan `distorsi_terdeteksi`.

    Service ini tidak memanggil Gemini. Pemanggilan analyzer tetap dilakukan di
    `analyzer_service.py`, lalu hasilnya dipersist lewat fungsi ini.
    """
    session_result = await db.execute(
        select(SesiJurnal).where(SesiJurnal.id_sesi_jurnal == id_sesi_jurnal)
    )
    sesi_jurnal = session_result.scalar_one_or_none()
    if sesi_jurnal is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sesi jurnal tidak ditemukan",
        )

    existing_result = await db.execute(
        select(PraAsesmen).where(PraAsesmen.id_sesi_jurnal == id_sesi_jurnal)
    )
    if existing_result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pra asesmen untuk sesi jurnal ini sudah ada",
        )

    pra_asesmen = PraAsesmen(
        id_sesi_jurnal=id_sesi_jurnal,
        id_psikolog=id_psikolog,
        indikator_urgensi=analysis.indikator_urgensi,
        skor_keparahan=analysis.skor_keparahan,
        ringkasan_kondisi=analysis.ringkasan_kondisi,
        rekomendasi=analysis.rekomendasi,
        status_validasi=_status_validasi_awal(analysis),
    )
    db.add(pra_asesmen)
    await db.flush()

    for distorsi in analysis.distorsi_terdeteksi:
        db.add(
            DistorsiTerdeteksi(
                id_pra_asesmen=pra_asesmen.id_pra_asesmen,
                tipe_distorsi=distorsi.tipe_distorsi,
                penjelasan=distorsi.penjelasan,
                kalimat_bukti=distorsi.kalimat_bukti,
                skor_keyakinan_ai=distorsi.skor_keyakinan_ai,
            )
        )

    await db.commit()
    await db.refresh(pra_asesmen)
    return pra_asesmen


async def get_patient_pre_assessment(
    db: AsyncSession,
    current_user: Pengguna,
    id_pra_asesmen: int,
) -> PraAsesmen:
    """
    Ambil pra-asesmen milik pasien login.

    Ownership dicek lewat rantai `pra_asesmen -> sesi_jurnal -> pasien`.
    """
    result = await db.execute(
        select(PraAsesmen)
        .join(SesiJurnal, PraAsesmen.id_sesi_jurnal == SesiJurnal.id_sesi_jurnal)
        .join(Pasien, SesiJurnal.id_pasien == Pasien.id_pasien)
        .where(
            PraAsesmen.id_pra_asesmen == id_pra_asesmen,
            Pasien.id_pengguna == current_user.id,
        )
        .options(
            selectinload(PraAsesmen.distorsi_terdeteksi),
            selectinload(PraAsesmen.psikolog),
            selectinload(PraAsesmen.sesi_jurnal).selectinload(SesiJurnal.pasien),
            selectinload(PraAsesmen.sesi_jurnal).selectinload(SesiJurnal.jawaban),
        )
    )
    pra_asesmen = result.scalar_one_or_none()
    if pra_asesmen is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pra asesmen tidak ditemukan",
        )

    return pra_asesmen


async def assign_psikolog_to_pre_assessment(
    db: AsyncSession,
    current_user: Pengguna,
    id_pra_asesmen: int,
    id_psikolog: int,
) -> PraAsesmen:
    """
    Simpan psikolog pilihan pasien untuk pra-asesmen miliknya.
    """
    pra_asesmen = await get_patient_pre_assessment(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
    )

    if (
        pra_asesmen.status_validasi == "perlu_eskalasi"
        or pra_asesmen.indikator_urgensi == "critical"
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pra asesmen krisis tidak dapat masuk antrean review normal",
        )

    if pra_asesmen.feedback_psikolog and pra_asesmen.feedback_psikolog.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pra asesmen ini sudah memiliki feedback psikolog",
        )

    psikolog_result = await db.execute(
        select(Psikolog).where(
            Psikolog.id_psikolog == id_psikolog,
            Psikolog.status_akun == "terverifikasi",
            Psikolog.apakah_sudah_ganti_password.is_(True),
        )
    )
    psikolog = psikolog_result.scalar_one_or_none()
    if psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Psikolog terverifikasi tidak ditemukan",
        )

    pra_asesmen.id_psikolog = psikolog.id_psikolog
    if pra_asesmen.status_validasi not in {"sedang_direview", "selesai"}:
        pra_asesmen.status_validasi = "menunggu"

    await db.commit()
    return await get_patient_pre_assessment(
        db=db,
        current_user=current_user,
        id_pra_asesmen=id_pra_asesmen,
    )


async def list_available_psikolog(db: AsyncSession) -> list[Psikolog]:
    """
    List psikolog yang sudah siap menerima tindak lanjut pasien.
    """
    result = await db.execute(
        select(Psikolog)
        .where(
            Psikolog.status_akun == "terverifikasi",
            Psikolog.apakah_sudah_ganti_password.is_(True),
        )
        .order_by(Psikolog.nama_lengkap.asc())
    )
    return list(result.scalars().all())


async def list_patient_pre_assessments(
    db: AsyncSession,
    current_user: Pengguna,
) -> list[PraAsesmen]:
    """
    Ambil semua pra-asesmen milik pasien login.
    """
    result = await db.execute(
        select(PraAsesmen)
        .join(SesiJurnal, PraAsesmen.id_sesi_jurnal == SesiJurnal.id_sesi_jurnal)
        .join(Pasien, SesiJurnal.id_pasien == Pasien.id_pasien)
        .where(Pasien.id_pengguna == current_user.id)
        .options(
            selectinload(PraAsesmen.distorsi_terdeteksi),
            selectinload(PraAsesmen.psikolog),
            selectinload(PraAsesmen.sesi_jurnal).selectinload(SesiJurnal.pasien),
            selectinload(PraAsesmen.sesi_jurnal).selectinload(SesiJurnal.jawaban),
        )
        .order_by(PraAsesmen.dibuat_pada.desc())
    )
    return list(result.scalars().all())


async def get_psikolog_by_pengguna_id(db: AsyncSession, id_pengguna) -> Psikolog:
    result = await db.execute(
        select(Psikolog).where(Psikolog.id_pengguna == id_pengguna)
    )
    psikolog = result.scalar_one_or_none()
    if psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil psikolog tidak ditemukan",
        )
    return psikolog


async def list_psikolog_pre_assessments(
    db: AsyncSession,
    current_user: Pengguna,
) -> list[PraAsesmen]:
    """
    Ambil semua pra-asesmen yang ditugaskan ke psikolog login.
    """
    psikolog = await get_psikolog_by_pengguna_id(db, current_user.id)
    result = await db.execute(
        select(PraAsesmen)
        .join(SesiJurnal, PraAsesmen.id_sesi_jurnal == SesiJurnal.id_sesi_jurnal)
        .join(Pasien, SesiJurnal.id_pasien == Pasien.id_pasien)
        .where(PraAsesmen.id_psikolog == psikolog.id_psikolog)
        .options(
            selectinload(PraAsesmen.distorsi_terdeteksi),
            selectinload(PraAsesmen.psikolog),
            selectinload(PraAsesmen.sesi_jurnal).selectinload(SesiJurnal.pasien),
            selectinload(PraAsesmen.sesi_jurnal).selectinload(SesiJurnal.jawaban),
        )
        .order_by(PraAsesmen.dibuat_pada.desc())
    )
    return list(result.scalars().all())


async def get_psikolog_pre_assessment(
    db: AsyncSession,
    current_user: Pengguna,
    id_pra_asesmen: int,
) -> PraAsesmen:
    """
    Ambil pra-asesmen spesifik yang ditugaskan ke psikolog login.
    """
    psikolog = await get_psikolog_by_pengguna_id(db, current_user.id)
    result = await db.execute(
        select(PraAsesmen)
        .where(
            PraAsesmen.id_pra_asesmen == id_pra_asesmen,
            PraAsesmen.id_psikolog == psikolog.id_psikolog,
        )
        .options(
            selectinload(PraAsesmen.distorsi_terdeteksi),
            selectinload(PraAsesmen.psikolog),
            selectinload(PraAsesmen.sesi_jurnal).selectinload(SesiJurnal.pasien),
            selectinload(PraAsesmen.sesi_jurnal).selectinload(SesiJurnal.jawaban),
        )
    )
    pra_asesmen = result.scalar_one_or_none()
    if pra_asesmen is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pra asesmen tidak ditemukan atau tidak ditugaskan kepada Anda",
        )
    return pra_asesmen


async def submit_pre_assessment_feedback(
    db: AsyncSession,
    current_user: Pengguna,
    id_pra_asesmen: int,
    feedback_psikolog: str,
    status_validasi: str = "selesai",
) -> PraAsesmen:
    """
    Simpan feedback psikolog pada pra-asesmen.
    """
    from sqlalchemy import func
    pra_asesmen = await get_psikolog_pre_assessment(db, current_user, id_pra_asesmen)

    normalized_feedback = feedback_psikolog.strip()
    normalized_status = status_validasi or "selesai"

    if normalized_status == "selesai" and len(normalized_feedback) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback psikolog minimal 10 karakter untuk menyelesaikan review",
        )

    pra_asesmen.feedback_psikolog = normalized_feedback or None
    pra_asesmen.status_validasi = normalized_status
    pra_asesmen.divalidasi_pada = func.now() if normalized_feedback else None

    await db.commit()

    # Reload and return
    return await get_psikolog_pre_assessment(db, current_user, id_pra_asesmen)
