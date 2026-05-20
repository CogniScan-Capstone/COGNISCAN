from datetime import datetime

from pydantic import BaseModel


class PatientLatestScreeningStatus(BaseModel):
    id_pra_asesmen: int
    id_sesi_jurnal: int | None = None
    id_psikolog: int | None = None
    nama_psikolog: str | None = None
    konteks_pemicu: str | None = None
    status: str
    status_validasi: str | None = None
    indikator_urgensi: str | None = None
    skor_keparahan: int | None = None
    feedback_tersedia: bool
    dibuat_pada: datetime | None = None
    divalidasi_pada: datetime | None = None


class PatientDashboardSummaryResponse(BaseModel):
    pesan_baru: int
    total_konsultasi: int
    screening_terakhir: PatientLatestScreeningStatus | None = None


class PsikologRecentReport(BaseModel):
    id_pra_asesmen: int
    nama_pasien: str | None = None
    konteks_pemicu: str | None = None
    indikator_urgensi: str | None = None
    status_validasi: str | None = None
    feedback_tersedia: bool
    dibuat_pada: datetime | None = None


class PsikologDashboardSummaryResponse(BaseModel):
    feedback_belum_direspon: int
    feedback_sudah_direspon: int
    total_laporan: int
    laporan_terbaru: list[PsikologRecentReport] = []
