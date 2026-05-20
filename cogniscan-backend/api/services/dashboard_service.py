from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from api.models.pasien import Pasien
from api.models.pemesanan_konsultasi import PemesananKonsultasi
from api.models.pengguna import Pengguna
from api.models.pra_asesmen import PraAsesmen
from api.models.sesi_jurnal import SesiJurnal
from api.schemas.dashboard import (
    PatientDashboardSummaryResponse,
    PatientLatestScreeningStatus,
    PsikologDashboardSummaryResponse,
    PsikologRecentReport,
)
from api.models.psikolog import Psikolog


def _has_feedback(pra_asesmen: PraAsesmen) -> bool:
    return bool(
        pra_asesmen.feedback_psikolog
        and pra_asesmen.feedback_psikolog.strip()
    )


def _derive_patient_screening_status(pra_asesmen: PraAsesmen) -> str:
    if (
        pra_asesmen.status_validasi == "perlu_eskalasi"
        or pra_asesmen.indikator_urgensi == "critical"
    ):
        return "perlu_eskalasi"

    if _has_feedback(pra_asesmen) or pra_asesmen.status_validasi == "selesai":
        return "feedback_tersedia"

    if pra_asesmen.status_validasi == "sedang_direview":
        return "sedang_direview"

    if pra_asesmen.id_psikolog is not None:
        return "menunggu_review"

    return "menunggu_pilih_psikolog"


def _build_latest_screening_status(
    pra_asesmen: PraAsesmen | None,
) -> PatientLatestScreeningStatus | None:
    if pra_asesmen is None:
        return None

    return PatientLatestScreeningStatus(
        id_pra_asesmen=pra_asesmen.id_pra_asesmen,
        id_sesi_jurnal=pra_asesmen.id_sesi_jurnal,
        id_psikolog=pra_asesmen.id_psikolog,
        nama_psikolog=pra_asesmen.nama_psikolog,
        konteks_pemicu=pra_asesmen.konteks_pemicu,
        status=_derive_patient_screening_status(pra_asesmen),
        status_validasi=pra_asesmen.status_validasi,
        indikator_urgensi=pra_asesmen.indikator_urgensi,
        skor_keparahan=pra_asesmen.skor_keparahan,
        feedback_tersedia=_has_feedback(pra_asesmen),
        dibuat_pada=pra_asesmen.dibuat_pada,
        divalidasi_pada=pra_asesmen.divalidasi_pada,
    )


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
    latest_screening_result = await db.execute(
        select(PraAsesmen)
        .join(SesiJurnal, PraAsesmen.id_sesi_jurnal == SesiJurnal.id_sesi_jurnal)
        .where(SesiJurnal.id_pasien == pasien.id_pasien)
        .options(
            selectinload(PraAsesmen.psikolog),
            selectinload(PraAsesmen.sesi_jurnal),
        )
        .order_by(PraAsesmen.dibuat_pada.desc(), PraAsesmen.id_pra_asesmen.desc())
        .limit(1)
    )

    return PatientDashboardSummaryResponse(
        pesan_baru=int(pesan_result.scalar_one() or 0),
        total_konsultasi=int(total_konsultasi_result.scalar_one() or 0),
        screening_terakhir=_build_latest_screening_status(
            latest_screening_result.scalar_one_or_none()
        ),
    )


async def get_psikolog_dashboard_summary(
    db: AsyncSession,
    current_user: Pengguna,
) -> PsikologDashboardSummaryResponse:
    """Ringkasan dashboard untuk psikolog login."""
    if current_user.peran != "psikolog":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Endpoint ini hanya untuk psikolog",
        )

    # Get psikolog record
    psikolog_result = await db.execute(
        select(Psikolog).where(Psikolog.id_pengguna == current_user.id)
    )
    psikolog = psikolog_result.scalar_one_or_none()
    if psikolog is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profil psikolog tidak ditemukan",
        )

    id_psikolog = psikolog.id_psikolog

    # Count feedback belum direspon
    belum_result = await db.execute(
        select(func.count(PraAsesmen.id_pra_asesmen)).where(
            PraAsesmen.id_psikolog == id_psikolog,
            (
                PraAsesmen.feedback_psikolog.is_(None)
                | (func.length(func.trim(PraAsesmen.feedback_psikolog)) == 0)
            ),
            PraAsesmen.status_validasi != "selesai",
        )
    )
    feedback_belum = int(belum_result.scalar_one() or 0)

    # Count feedback sudah direspon
    sudah_result = await db.execute(
        select(func.count(PraAsesmen.id_pra_asesmen)).where(
            PraAsesmen.id_psikolog == id_psikolog,
            (
                PraAsesmen.feedback_psikolog.is_not(None)
                & (func.length(func.trim(PraAsesmen.feedback_psikolog)) > 0)
            )
            | (PraAsesmen.status_validasi == "selesai"),
        )
    )
    feedback_sudah = int(sudah_result.scalar_one() or 0)

    # Total laporan
    total_result = await db.execute(
        select(func.count(PraAsesmen.id_pra_asesmen)).where(
            PraAsesmen.id_psikolog == id_psikolog,
        )
    )
    total_laporan = int(total_result.scalar_one() or 0)

    # 5 laporan terbaru
    recent_result = await db.execute(
        select(PraAsesmen)
        .where(PraAsesmen.id_psikolog == id_psikolog)
        .options(
            selectinload(PraAsesmen.sesi_jurnal).selectinload(SesiJurnal.pasien),
        )
        .order_by(PraAsesmen.dibuat_pada.desc(), PraAsesmen.id_pra_asesmen.desc())
        .limit(5)
    )
    recent_rows = recent_result.scalars().all()

    laporan_terbaru = []
    for row in recent_rows:
        has_fb = bool(row.feedback_psikolog and row.feedback_psikolog.strip())
        nama = None
        if row.sesi_jurnal and row.sesi_jurnal.pasien:
            nama = row.sesi_jurnal.pasien.nama_lengkap
        laporan_terbaru.append(
            PsikologRecentReport(
                id_pra_asesmen=row.id_pra_asesmen,
                nama_pasien=nama or row.nama_pasien,
                konteks_pemicu=row.konteks_pemicu,
                indikator_urgensi=row.indikator_urgensi,
                status_validasi=row.status_validasi,
                feedback_tersedia=has_fb or row.status_validasi == "selesai",
                dibuat_pada=row.dibuat_pada,
            )
        )

    return PsikologDashboardSummaryResponse(
        feedback_belum_direspon=feedback_belum,
        feedback_sudah_direspon=feedback_sudah,
        total_laporan=total_laporan,
        laporan_terbaru=laporan_terbaru,
    )
