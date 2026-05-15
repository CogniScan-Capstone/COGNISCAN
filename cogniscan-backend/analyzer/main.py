"""
CogniScan v2.0 - EXPERIMENTAL Gemini 3 Pro Test
==================================================

⚠️  PERINGATAN: Ini versi EKSPERIMEN saja, bukan production.
    - Cost ~15-20x lebih mahal dari Gemini 2.5 Flash
    - Latency lebih lambat (5-15s vs 1.4s)
    - Model preview, bisa discontinued sewaktu-waktu
    - Untuk hasil final, gunakan main.py (Gemini 2.5 Flash)

Tujuan: Benchmark perbandingan Gemini 2.5 Flash vs Gemini 3 Pro
        untuk task deteksi distorsi kognitif Bahasa Indonesia.

Perbedaan dari main.py:
1. Model: gemini-3-pro-preview (bukan gemini-3.0-pro yang error)
2. Location: global (Gemini 3 hanya di global endpoint)
3. Parameter: thinking_level (bukan thinking_budget yang deprecated)
4. Output filename: results_gemini3 (terpisah dari hasil 2.5 Flash)
"""

import os
import json
import time
import logging
from pathlib import Path
from typing import Literal
from dotenv import load_dotenv
from google import genai
from google.genai import types as genai_types
from google.api_core import exceptions as google_exceptions
from pydantic import BaseModel, Field, ValidationError

# Load environment variables
load_dotenv()

# ============================================================
# LOGGING SETUP
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('cogniscan_gemini3.log', mode='a', encoding='utf-8'),
        logging.StreamHandler(),
    ]
)
logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURATION
# ============================================================
# Model Gemini 3 Pro (preview).
# CATATAN: gemini-3.1-pro-preview adalah versi terbaru per Februari 2026.
# Kalau gemini-3-pro-preview error, ganti ke gemini-3.1-pro-preview.
DEFAULT_MODEL_NAME = "gemini-3.1-pro-preview"
LOCATION = "global"

# PENTING: Gemini 3 series HANYA tersedia di global endpoint.
# Force override location ke "global" walaupun .env set ke us-central1/asia-southeast1.
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL", DEFAULT_MODEL_NAME)

if not GEMINI_API_KEY:
      raise RuntimeError("GEMINI_API_KEY belum diset di .env")

client = genai.Client(api_key=GEMINI_API_KEY)


# ============================================================
# PYDANTIC SCHEMAS (sama dengan main.py untuk konsistensi)
# ============================================================

DISTORTION_LABELS = Literal[
    "All-or-nothing",
    "Overgeneralization",
    "Mental filter",
    "Discounting the positives",
    "Mind Reading",
    "Fortune-telling",
    "Magnification or Minimization",
    "Emotional Reasoning",
    "Should statement",
    "Labeling",
    "Personalization and Blame",
    "No Distortion",
]


class DistortionDetection(BaseModel):
    distortion_type: DISTORTION_LABELS
    evidence_sentence: str
    explanation: str
    confidence: float = Field(ge=0.0, le=1.0)


class CrisisIndicators(BaseModel):
    self_harm_mention: bool = Field(default=False)
    suicidal_ideation: bool = Field(default=False)
    hopelessness_level: Literal["none", "mild", "moderate", "severe"] = Field(default="none")


class CognitiveDistortionAnalysis(BaseModel):
    summary: str
    detected_distortions: list[DistortionDetection] = Field(default_factory=list)
    severity_score: int = Field(ge=1, le=10)
    severity_flag: Literal["low", "medium", "high", "critical"] = Field(default="low")
    crisis_indicators: CrisisIndicators = Field(default_factory=CrisisIndicators)
    requires_immediate_attention: bool = Field(default=False)
    psychoeducation_message: str = Field(default="")


# ============================================================
# CORE FUNCTIONS
# ============================================================

def load_system_prompt(version: str = "v2") -> str:
    """Load system prompt dari file."""
    candidates = [
        Path(__file__).parent / "prompts" / f"system_prompt_{version}.md",
        Path(f"prompts/system_prompt_{version}.md"),
        Path(f"system_prompt_{version}.md"),
    ]
    for path in candidates:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
    raise FileNotFoundError(f"System prompt v{version} tidak ditemukan")


class AnalysisError(Exception):
    def __init__(self, message: str, error_type: str, details: dict):
        super().__init__(message)
        self.error_type = error_type
        self.details = details


def analyze_narrative_with_retry(
    text: str,
    prompt_version: str = "v2",
    max_retries: int = 3,
    initial_delay: float = 1.0,
) -> CognitiveDistortionAnalysis:
    """
    Analisis dengan Gemini 3 Pro.
    
    KEY DIFFERENCE dari main.py:
    - thinking_level=LOW (bukan thinking_budget=0)
      Gemini 3 tidak bisa disable thinking total, tapi bisa di-set ke LOW
      untuk balance speed vs quality.
    """
    system_instruction = load_system_prompt(prompt_version)
    text_len = len(text)
    
    # Output budget lebih besar untuk Gemini 3 (thinking tetap pakai tokens)
    if text_len > 800:
        max_output = 16384
    elif text_len > 400:
        max_output = 12288
    else:
        max_output = 8192
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model=MODEL_NAME,
                contents=text,
                config=genai_types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=CognitiveDistortionAnalysis,
                    temperature=0.2,
                    max_output_tokens=max_output,
                    # GEMINI 3 SPECIFIC: thinking_level menggantikan thinking_budget
                    # LOW = minimum thinking untuk task klasifikasi cepat
                    # MEDIUM = balanced
                    # HIGH = full reasoning (default, paling lambat & mahal)
                    thinking_config=genai_types.ThinkingConfig(
                        thinking_level=genai_types.ThinkingLevel.LOW,
                    ),
                ),
            )
            
            if response.parsed is None:
                raw_text = response.text if hasattr(response, 'text') else ""
                
                finish_reason = "UNKNOWN"
                if hasattr(response, 'candidates') and response.candidates:
                    fr = getattr(response.candidates[0], 'finish_reason', None)
                    finish_reason = str(fr) if fr else "UNKNOWN"
                
                logger.warning(
                    f"Parse failed (attempt {attempt + 1}). "
                    f"Text length: {text_len}, max_output: {max_output}, "
                    f"finish_reason: {finish_reason}, "
                    f"raw response length: {len(raw_text) if raw_text else 0}"
                )
                
                if "MAX_TOKENS" in finish_reason:
                    raise AnalysisError(
                        f"Output token limit reached (max: {max_output})",
                        error_type="MAX_TOKENS",
                        details={
                            "text_length": text_len,
                            "max_output": max_output,
                            "finish_reason": finish_reason,
                        }
                    )
                
                # Manual parse fallback
                try:
                    if raw_text and raw_text.strip():
                        clean_text = raw_text.strip()
                        if clean_text.startswith("```"):
                            clean_text = clean_text.split("```")[1]
                            if clean_text.startswith("json"):
                                clean_text = clean_text[4:]
                            clean_text = clean_text.strip()
                        
                        manual_parsed = json.loads(clean_text)
                        result = CognitiveDistortionAnalysis(**manual_parsed)
                        logger.info(f"Manual parse berhasil (text_len={text_len})")
                        return result
                except (json.JSONDecodeError, ValidationError) as parse_err:
                    raise AnalysisError(
                        f"Manual parse gagal: {parse_err}",
                        error_type="PARSE_FAILED",
                        details={
                            "raw_text_preview": raw_text[:500] if raw_text else "EMPTY",
                            "parse_error": str(parse_err),
                            "text_length": text_len,
                            "finish_reason": finish_reason,
                        }
                    )
                
                raise AnalysisError(
                    "Empty response dari Gemini 3",
                    error_type="EMPTY_RESPONSE",
                    details={"text_length": text_len, "finish_reason": finish_reason}
                )
            
            return response.parsed
        
        except google_exceptions.ResourceExhausted as e:
            wait_time = initial_delay * (2 ** attempt)
            logger.warning(f"Rate limit (attempt {attempt + 1}). Waiting {wait_time}s...")
            last_error = e
            time.sleep(wait_time)
        
        except google_exceptions.DeadlineExceeded as e:
            wait_time = initial_delay * (2 ** attempt)
            logger.warning(f"Timeout (attempt {attempt + 1}). Waiting {wait_time}s...")
            last_error = e
            time.sleep(wait_time)
        
        except google_exceptions.ServiceUnavailable as e:
            wait_time = initial_delay * (2 ** attempt)
            logger.warning(f"Service unavailable (attempt {attempt + 1}). Waiting {wait_time}s...")
            last_error = e
            time.sleep(wait_time)
        
        except AnalysisError:
            raise
        
        except Exception as e:
            logger.error(f"Unexpected error (attempt {attempt + 1}): {type(e).__name__}: {e}")
            last_error = e
            time.sleep(initial_delay * (2 ** attempt))
    
    raise AnalysisError(
        f"Gagal setelah {max_retries} retry: {last_error}",
        error_type="RETRY_EXHAUSTED",
        details={
            "last_error": str(last_error),
            "error_class": type(last_error).__name__ if last_error else "None"
        }
    )


def analyze_narrative(text: str, prompt_version: str = "v2"):
    return analyze_narrative_with_retry(text, prompt_version)


# ============================================================
# DEMO / SMOKE TEST
# ============================================================

def print_analysis(result: CognitiveDistortionAnalysis):
    print("\n" + "=" * 60)
    print("HASIL ANALISIS COGNISCAN (Gemini 3 Pro)")
    print("=" * 60)
    print(f"\nRINGKASAN:\n   {result.summary}")
    print(f"\nSEVERITY: {result.severity_flag.upper()} (score: {result.severity_score}/10)")
    
    if result.requires_immediate_attention:
        print("\nPERHATIAN: Kasus ini memerlukan perhatian segera!")
    
    print(f"\nDISTORSI TERDETEKSI ({len(result.detected_distortions)}):")
    for i, d in enumerate(result.detected_distortions, 1):
        print(f"\n   {i}. {d.distortion_type} (confidence: {d.confidence:.0%})")
        print(f"      Evidence: \"{d.evidence_sentence}\"")
        print(f"      Penjelasan: {d.explanation}")


if __name__ == "__main__":
    # SMOKE TEST: hanya 3 kasus untuk verifikasi koneksi & parameter
    # JANGAN langsung run evaluate.py ke 120 sample sebelum ini sukses
    
    test_cases = [
        {
            "label": "Short test (97 chars)",
            "text": "Aku merasa hidup ini gak ada gunanya. Aku selalu gagal di semua hal yang aku coba lakukan.",
        },
        {
            "label": "Medium test (~250 chars)",
            "text": "Pada saat pertandingan taekwondo, saya mendapatkan juara 2. saat saya di podium ke 2 saya merasa sangat gagal,kecewa, dan tidak menerima apa yang terjadi, saya terus menerus menyalahkan diri saya.",
        },
        {
            "label": "Healthy text (no distortion)",
            "text": "Saya kecewa hari ini karena tidak lolos seleksi, tapi saya tahu masih ada kesempatan lain dan saya akan coba lagi minggu depan.",
        },
    ]
    
    print(f"\n{'=' * 60}")
    print(f"COGNISCAN EXPERIMENTAL - Model: {MODEL_NAME}")
    print(f"Location: {LOCATION}")
    print(f"{'=' * 60}\n")
    
    success_count = 0
    error_count = 0
    total_latency = 0
    
    for case in test_cases:
        print(f"\n{'#' * 60}")
        print(f"# TEST: {case['label']}")
        print(f"# Text length: {len(case['text'])} chars")
        print(f"{'#' * 60}")
        
        try:
            start = time.time()
            result = analyze_narrative_with_retry(case['text'])
            elapsed = time.time() - start
            total_latency += elapsed
            success_count += 1
            print(f"SUCCESS ({elapsed:.2f}s)")
            print_analysis(result)
        except AnalysisError as e:
            error_count += 1
            print("ANALYSIS ERROR")
            print(f"   Type: {e.error_type}")
            print(f"   Message: {e}")
            print(f"   Details: {json.dumps(e.details, indent=2, ensure_ascii=False)[:500]}")
        except Exception as e:
            error_count += 1
            print(f"UNEXPECTED ERROR: {type(e).__name__}: {e}")
            
            # Diagnostic untuk error umum
            if "404" in str(e) or "NOT_FOUND" in str(e):
                print("\n  → Kemungkinan masalah:")
                print("    1. Model name salah. Coba 'gemini-3.1-pro-preview'")
                print("    2. Project belum diaktifkan untuk akses Gemini 3")
                print("    3. Quota belum tersedia di project kamu")
            elif "permission" in str(e).lower() or "403" in str(e):
                print("\n  → Kemungkinan masalah:")
                print("    1. Service account belum punya akses Gemini 3")
                print("    2. Billing belum aktif")
            elif "thinking_budget" in str(e).lower():
                print("\n  → Parameter 'thinking_budget' deprecated di Gemini 3")
                print("    Pakai 'thinking_level' (LOW/MEDIUM/HIGH)")
    
    # Summary
    print(f"\n{'=' * 60}")
    print("SUMMARY EKSPERIMEN GEMINI 3 PRO")
    print(f"{'=' * 60}")
    print(f"Success: {success_count}/{len(test_cases)}")
    print(f"Errors:  {error_count}/{len(test_cases)}")
    if success_count > 0:
        print(f"Avg latency: {total_latency/success_count:.2f}s")
        print("\nUntuk perbandingan, Gemini 2.5 Flash latency rata-rata: 1.38s")
    
    print("\nLog file: cogniscan_gemini3.log")
    print(f"\n{'=' * 60}")
    print("KEPUTUSAN BERIKUTNYA:")
    print("- Jika 3/3 sukses -> bisa lanjut evaluate.py untuk full benchmark")
    print("- Jika ada error -> cek log dan diagnostic di atas")
    print("- Jika latency > 10s -> pertimbangkan revert ke Gemini 2.5 Flash")
    print(f"{'=' * 60}\n")
