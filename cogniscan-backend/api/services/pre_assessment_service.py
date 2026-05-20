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
        .options(selectinload(PraAsesmen.distorsi_terdeteksi))
    )
    pra_asesmen = result.scalar_one_or_none()
    if pra_asesmen is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pra asesmen tidak ditemukan",
        )

    return pra_asesmen


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
            selectinload(PraAsesmen.sesi_jurnal),
        )
        .order_by(PraAsesmen.dibuat_pada.desc())
    )
    return list(result.scalars().all())
