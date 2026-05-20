from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.pasien import Pasien
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.pengguna import Pengguna
from api.models.pra_asesmen import PraAsesmen
from api.models.sesi_jurnal import SesiJurnal
from api.schemas.dashboard import PatientDashboardSummaryResponse


async def get_patient_dashboard_summary(
    db: AsyncSession,
    current_user: Pengguna,
) -> PatientDashboardSummaryResponse:
    if current_user.peran != "pasien":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint ini hanya untuk pasien",
        )

    pasien_result = await db.execute(
        select(Pasien).where(Pasien.id_pengguna == current_user.id)
    )
    pasien = pasien_result.scalar_one_or_none()
    if pasien is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil pasien tidak ditemukan",
        )

    pesan_result = await db.execute(
        select(func.count(PraAsesmen.id_pra_asesmen))
        .join(SesiJurnal, PraAsesmen.id_sesi_jurnal == SesiJurnal.id_sesi_jurnal)
        .where(
            SesiJurnal.id_pasien == pasien.id_pasien,
            PraAsesmen.feedback_psikolog.is_not(None),
            func.length(func.trim(PraAsesmen.feedback_psikolog)) > 0,
        )
    )
    total_konsultasi_result = await db.execute(
        select(func.count(PemesananKonsultasi.id_pemesanan_konsultasi)).where(
            PemesananKonsultasi.id_pasien == pasien.id_pasien
        )
    )

    return PatientDashboardSummaryResponse(
        pesan_baru=int(pesan_result.scalar_one() or 0),
        total_konsultasi=int(total_konsultasi_result.scalar_one() or 0),
    )
