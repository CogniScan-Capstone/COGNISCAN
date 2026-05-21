from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


JournalStatus = Literal["sedang_berjalan", "selesai", "dibatalkan"]


class CrisisContactResponse(BaseModel):
    name: str
    type: str
    phone: str | None = None
    note: str | None = None


class JournalSessionStart(BaseModel):
    konteks_pemicu: str | None = Field(default=None, max_length=150)
    total_pertanyaan: int = Field(default=10, ge=1, le=20)
    consent_ai_processing: bool = Field(
        ...,
        description="Harus true sebelum jawaban pasien diproses oleh analyzer AI.",
    )


class JournalAnswerSubmit(BaseModel):
    urutan_pertanyaan: int = Field(..., ge=1)
    teks_pertanyaan: str = Field(..., min_length=3, max_length=500)
    teks_jawaban: str = Field(..., min_length=1, max_length=5000)


class JournalAnswerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_jawaban_jurnal: int
    id_sesi_jurnal: int | None = None
    urutan_pertanyaan: int | None = None
    teks_pertanyaan: str | None = None
    teks_jawaban: str | None = None
    dijawab_pada: datetime | None = None


class JournalVoiceAnswerResponse(JournalAnswerResponse):
    transkrip: str | None = None
    indikator_non_verbal: str | None = None
    ringkasan_klinis: str | None = None
    catatan_kualitas_audio: str | None = None


class JournalVoiceAnswerAcceptedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_jawaban_jurnal: int
    id_sesi_jurnal: int | None = None
    urutan_pertanyaan: int | None = None
    dijawab_pada: datetime | None = None
    status: str = "tersimpan"
    message: str = "Voice note berhasil diproses dan disimpan untuk psikolog."


class JournalSessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_sesi_jurnal: int
    id_pasien: int | None = None
    konteks_pemicu: str | None = None
    total_pertanyaan: int | None = None
    status: JournalStatus | str | None = None
    dimulai_pada: datetime | None = None
    diselesaikan_pada: datetime | None = None
    jawaban: list[JournalAnswerResponse] = Field(default_factory=list)


class DetectedDistortionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_distorsi_terdeteksi: int
    id_pra_asesmen: int | None = None
    tipe_distorsi: str | None = None
    penjelasan: str | None = None
    kalimat_bukti: str | None = None
    skor_keyakinan_ai: Decimal | None = None


class PreAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id_pra_asesmen: int
    id_sesi_jurnal: int | None = None
    id_psikolog: int | None = None
    indikator_urgensi: str | None = None
    skor_keparahan: int | None = None
    ringkasan_kondisi: str | None = None
    rekomendasi: str | None = None
    feedback_psikolog: str | None = None
    status_validasi: str | None = None
    divalidasi_pada: datetime | None = None
    dibuat_pada: datetime | None = None
    distorsi_terdeteksi: list[DetectedDistortionResponse] = Field(default_factory=list)


class JournalFinalizeResponse(BaseModel):
    session: JournalSessionResponse
    pra_asesmen: PreAssessmentResponse
    is_crisis: bool
    message: str
    crisis_contacts: list[CrisisContactResponse] = Field(default_factory=list)
