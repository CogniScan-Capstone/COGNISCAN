from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

from api.core.config import settings


DOCUMENT_SUBDIR = "psikolog-documents"
ALLOWED_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}


def _storage_root() -> Path:
    configured = Path(settings.FILE_STORAGE_DIR)
    if configured.is_absolute():
        root = configured
    else:
        root = Path(__file__).resolve().parents[2] / configured
    root.mkdir(parents=True, exist_ok=True)
    return root.resolve()


def _safe_filename(filename: str) -> str:
    stem = Path(filename or "document.pdf").stem
    safe_stem = re.sub(r"[^A-Za-z0-9._-]+", "-", stem).strip(".-")[:80]
    return safe_stem or "document"


def _document_path(relative_path: str) -> Path | None:
    root = _storage_root()
    target = (root / relative_path).resolve()
    if root != target and root not in target.parents:
        return None
    return target


async def save_psikolog_document(file: UploadFile, kind: str) -> str:
    if kind not in {"str", "sip"}:
        raise ValueError("Jenis dokumen tidak valid")

    original_name = file.filename or ""
    if Path(original_name).suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dokumen STR/SIP wajib berformat PDF",
        )

    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content-Type dokumen harus application/pdf",
        )

    max_bytes = settings.PSIKOLOG_DOCUMENT_MAX_BYTES
    content = await file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Ukuran dokumen maksimal 10 MB",
        )

    if b"%PDF-" not in content[:1024]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File yang diunggah bukan PDF valid",
        )

    stored_name = f"{uuid4().hex}-{kind}-{_safe_filename(original_name)}.pdf"
    relative_path = f"{DOCUMENT_SUBDIR}/{stored_name}"
    target = _document_path(relative_path)
    if target is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Path dokumen tidak valid",
        )

    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(content)
    return relative_path


def resolve_psikolog_document(relative_path: str | None) -> Path | None:
    if not relative_path:
        return None

    target = _document_path(relative_path)
    if target is None or not target.is_file():
        return None
    return target


def delete_psikolog_documents(paths: list[str | None]) -> None:
    for relative_path in paths:
        target = _document_path(relative_path) if relative_path else None
        if target and target.is_file():
            target.unlink(missing_ok=True)
