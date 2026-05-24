from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class DistorsiTerdeteksiResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_distorsi_terdeteksi: int
    id_pra_asesmen: int | None = None
    tipe_distorsi: str | None = None
    penjelasan: str | None = None
    kalimat_bukti: str | None = None
    skor_keyakinan_ai: Decimal | None = None


class JawabanJurnalPraAsesmenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_jawaban_jurnal: int
    urutan_pertanyaan: int | None = None
    teks_pertanyaan: str | None = None
    teks_jawaban: str | None = None


class PraAsesmenPasienResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pra_asesmen: int
    id_sesi_jurnal: int | None = None
    id_psikolog: int | None = None
    nama_psikolog: str | None = None
    nama_pasien: str | None = None
    dialog_jurnal: str | None = None
    jawaban_jurnal: list[JawabanJurnalPraAsesmenResponse] = Field(default_factory=list)
    konteks_pemicu: str | None = None
    indikator_urgensi: str | None = None
    skor_keparahan: int | None = None
    ringkasan_kondisi: str | None = None
    rekomendasi: str | None = None
    feedback_psikolog: str | None = None
    rekomendasi_tindak_lanjut_psikolog: str | None = None
    status_validasi: str | None = None
    divalidasi_pada: datetime | None = None
    dibuat_pada: datetime | None = None
    distorsi_terdeteksi: list[DistorsiTerdeteksiResponse] = Field(default_factory=list)


class PraAsesmenAssignPsikologRequest(BaseModel):
    id_psikolog: int = Field(..., gt=0)


class PraAsesmenFeedbackRequest(BaseModel):
    feedback_psikolog: str = ""
    status_validasi: str | None = "selesai"
    catatan_internal_psikolog: str | None = None
    akurasi_ai_psikolog: str | None = None
    severity_final_psikolog: str | None = None
    rekomendasi_tindak_lanjut_psikolog: str | None = None


class PraAsesmenFeedbackDraftRequest(BaseModel):
    draft_feedback_psikolog: str | None = None
    draft_catatan_internal: str | None = None
    draft_akurasi_ai: str | None = None
    draft_severity_final: str | None = None
    draft_rekomendasi_tindak_lanjut: str | None = None


class PraAsesmenPsikologResponse(PraAsesmenPasienResponse):
    catatan_internal_psikolog: str | None = None
    akurasi_ai_psikolog: str | None = None
    severity_final_psikolog: str | None = None
    rekomendasi_tindak_lanjut_psikolog: str | None = None
    draft_feedback_psikolog: str | None = None
    draft_catatan_internal: str | None = None
    draft_akurasi_ai: str | None = None
    draft_severity_final: str | None = None
    draft_rekomendasi_tindak_lanjut: str | None = None
    draft_disimpan_pada: datetime | None = None


class PsikologAvailableResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_psikolog: int
    nama_lengkap: str
    spesialisasi: str | None = None
    pengalaman_tahun: int | None = None
    universitas_asal: str | None = None
    tahun_lulus: int | None = None
    alamat_praktik: str | None = None
    kota: str | None = None
    provinsi: str | None = None
    tarif_konsultasi: Decimal | None = None
    bio_singkat: str | None = None
    status_akun: str | None = None
    dibuat_pada: datetime | None = None
    tgl_kadaluarsa_str: date | None = None
    tgl_kadaluarsa_sip: date | None = None
