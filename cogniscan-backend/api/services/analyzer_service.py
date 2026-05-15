from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from decimal import Decimal


SEVERITY_MAP = {
    "low": "rendah",
    "medium": "sedang",
    "high": "tinggi",
    "critical": "critical",
}

SENSITIVE_TEXT_PATTERNS = (
    (re.compile(r"\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b"), "[EMAIL]"),
    (re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE), "[URL]"),
    (re.compile(r"(?<!\w)(?:\+62|62|0)8(?:[\s().-]?\d){7,}\b"), "[NOMOR_HP]"),
    (re.compile(r"\b\d{16}\b"), "[NIK]"),
)


@dataclass(frozen=True)
class AnalyzerDistortionResult:
    tipe_distorsi: str
    kalimat_bukti: str
    penjelasan: str
    skor_keyakinan_ai: Decimal


@dataclass(frozen=True)
class AnalyzerServiceResult:
    ringkasan_kondisi: str
    indikator_urgensi: str
    skor_keparahan: int
    rekomendasi: str
    requires_immediate_attention: bool
    has_self_harm_indicator: bool
    distorsi_terdeteksi: list[AnalyzerDistortionResult]


class AnalyzerServiceError(Exception):
    """Error saat service analyzer gagal memproses narasi."""


def mask_sensitive_text(text: str) -> str:
    """
    Masking data sensitif sebelum narasi dikirim ke Cloud LLM.

    Jangan log atau simpan hasil raw narasi di service ini. Masking di sini
    sengaja konservatif untuk email, URL, nomor HP Indonesia, dan NIK.
    """
    masked_text = text.strip()
    for pattern, replacement in SENSITIVE_TEXT_PATTERNS:
        masked_text = pattern.sub(replacement, masked_text)
    return masked_text


async def analyze_narrative_for_pre_assessment(
    narrative: str,
    prompt_version: str = "v2",
) -> AnalyzerServiceResult:
    """
    Jalankan analyzer secara async-friendly untuk kebutuhan pre-assessment.

    `analyzer.main.analyze_narrative` masih sync, jadi dipanggil lewat
    `asyncio.to_thread` agar tidak blocking event loop FastAPI.
    """
    masked_narrative = mask_sensitive_text(narrative)
    if not masked_narrative:
        raise ValueError("Narasi tidak boleh kosong")

    try:
        from analyzer.main import AnalysisError, analyze_narrative

        analysis = await asyncio.to_thread(
            analyze_narrative,
            masked_narrative,
            prompt_version,
        )
    except AnalysisError as exc:
        raise AnalyzerServiceError(str(exc)) from exc

    return normalize_analysis_result(analysis)


def normalize_analysis_result(analysis) -> AnalyzerServiceResult:
    """
    Normalisasi output analyzer ke struktur yang cocok untuk tabel backend.
    """
    severity_flag = getattr(analysis, "severity_flag", "low")
    indikator_urgensi = SEVERITY_MAP.get(severity_flag, "rendah")
    crisis_indicators = getattr(analysis, "crisis_indicators", None)

    has_self_harm_indicator = bool(
        getattr(crisis_indicators, "self_harm_mention", False)
        or getattr(crisis_indicators, "suicidal_ideation", False)
        or getattr(analysis, "requires_immediate_attention", False)
        or severity_flag == "critical"
    )

    distortions = []
    for item in getattr(analysis, "detected_distortions", []):
        distortions.append(
            AnalyzerDistortionResult(
                tipe_distorsi=getattr(item, "distortion_type", ""),
                kalimat_bukti=getattr(item, "evidence_sentence", ""),
                penjelasan=getattr(item, "explanation", ""),
                skor_keyakinan_ai=Decimal(str(getattr(item, "confidence", 0))),
            )
        )

    return AnalyzerServiceResult(
        ringkasan_kondisi=getattr(analysis, "summary", ""),
        indikator_urgensi=indikator_urgensi,
        skor_keparahan=getattr(analysis, "severity_score", 1),
        rekomendasi=getattr(analysis, "psychoeducation_message", ""),
        requires_immediate_attention=bool(
            getattr(analysis, "requires_immediate_attention", False)
        ),
        has_self_harm_indicator=has_self_harm_indicator,
        distorsi_terdeteksi=distortions,
    )
