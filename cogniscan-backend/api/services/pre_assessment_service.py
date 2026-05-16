from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.distorsi_terdeteksi import DistorsiTerdeteksi
from api.models.pra_asesmen import PraAsesmen
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
