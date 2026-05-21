from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from typing import Any

from google import genai
from google.genai import types as genai_types

from api.core.config import settings
from api.services.analyzer_service import mask_sensitive_text


MAX_AUDIO_BYTES = 10 * 1024 * 1024
ALLOWED_AUDIO_MIME_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/ogg",
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
}

VOICE_NOTE_PROMPT = """
Kamu adalah asisten pra-skrining CogniScan untuk psikolog.
Tugasmu memproses voice note pasien untuk satu pertanyaan screening.

Pertanyaan screening:
{question}

Instruksi:
1. Transkripsikan isi utama jawaban pasien secara akurat.
2. Identifikasi indikator nonverbal yang terdengar dari audio, seperti jeda panjang,
   tempo bicara, keraguan, intonasi cemas, atau tanda emosi lain. Jika tidak jelas,
   tulis "Tidak terdeteksi jelas dari audio".
3. Buat ringkasan klinis singkat yang siap dibaca psikolog.
4. Jangan membuat diagnosis. Jangan memberi klaim pasti tentang kondisi pasien.
5. Jangan menyertakan data kontak, NIK, URL, atau informasi sensitif bila terdengar.

Balas hanya JSON valid dengan field:
{{
  "transkrip": "teks transkrip ringkas",
  "indikator_non_verbal": "indikator nonverbal yang relevan",
  "ringkasan_klinis": "ringkasan klinis 2-4 kalimat",
  "catatan_kualitas_audio": "catatan bila audio kurang jelas, atau kosongkan"
}}
""".strip()


class VoiceNoteProcessingError(Exception):
    """Raised when Gemini cannot process a voice note."""


@dataclass(frozen=True)
class VoiceNoteProcessingResult:
    transkrip: str
    indikator_non_verbal: str
    ringkasan_klinis: str
    catatan_kualitas_audio: str = ""

    def as_journal_answer_text(self) -> str:
        sections = [
            ("Transkrip voice note", self.transkrip),
            ("Ringkasan klinis voice note", self.ringkasan_klinis),
            ("Indikator nonverbal", self.indikator_non_verbal),
        ]
        if self.catatan_kualitas_audio:
            sections.append(("Catatan kualitas audio", self.catatan_kualitas_audio))

        formatted = "\n\n".join(
            f"{title}:\n{content.strip()}"
            for title, content in sections
            if content and content.strip()
        )
        return formatted[:5000]


def validate_audio_payload(audio_bytes: bytes, mime_type: str | None) -> str:
    normalized_mime = (mime_type or "").split(";")[0].strip().lower()
    if not audio_bytes:
        raise ValueError("File audio kosong")
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise ValueError("Ukuran voice note maksimal 10 MB")
    if normalized_mime not in ALLOWED_AUDIO_MIME_TYPES:
        raise ValueError(
            "Format audio tidak didukung. Gunakan mp3, ogg, webm, wav, atau mp4."
        )
    return normalized_mime


def _extract_json_object(raw_text: str) -> dict[str, Any]:
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if not match:
            raise
        parsed = json.loads(match.group(0))

    if not isinstance(parsed, dict):
        raise ValueError("Respons Gemini bukan JSON object")
    return parsed


def _sanitize_text(value: Any) -> str:
    if value is None:
        return ""
    return mask_sensitive_text(str(value)).strip()


def _generate_voice_note_summary(
    audio_bytes: bytes,
    mime_type: str,
    question: str,
) -> VoiceNoteProcessingResult:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[
            genai_types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            VOICE_NOTE_PROMPT.format(question=question.strip()),
        ],
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
            max_output_tokens=4096,
        ),
    )

    raw_text = getattr(response, "text", "") or ""
    if not raw_text.strip():
        raise VoiceNoteProcessingError("Gemini tidak mengembalikan hasil voice note")

    try:
        payload = _extract_json_object(raw_text)
    except (json.JSONDecodeError, ValueError) as exc:
        raise VoiceNoteProcessingError("Respons voice note dari Gemini tidak valid") from exc

    result = VoiceNoteProcessingResult(
        transkrip=_sanitize_text(payload.get("transkrip")),
        indikator_non_verbal=_sanitize_text(payload.get("indikator_non_verbal")),
        ringkasan_klinis=_sanitize_text(payload.get("ringkasan_klinis")),
        catatan_kualitas_audio=_sanitize_text(payload.get("catatan_kualitas_audio")),
    )

    if not result.ringkasan_klinis and not result.transkrip:
        raise VoiceNoteProcessingError("Voice note tidak menghasilkan teks yang bisa dipakai")

    return result


async def process_voice_note_audio(
    audio_bytes: bytes,
    mime_type: str | None,
    question: str,
) -> VoiceNoteProcessingResult:
    normalized_mime = validate_audio_payload(audio_bytes, mime_type)
    try:
        return await asyncio.to_thread(
            _generate_voice_note_summary,
            audio_bytes,
            normalized_mime,
            question,
        )
    except VoiceNoteProcessingError:
        raise
    except Exception as exc:
        raise VoiceNoteProcessingError("Gemini gagal memproses voice note") from exc
