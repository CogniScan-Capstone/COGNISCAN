from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from api.dependencies.auth import get_current_active_admin
from api.dependencies.database import get_db
from api.main import app
from api.models.pengguna import Pengguna
from api.routers import admin as admin_router


def _admin_user() -> Pengguna:
    return Pengguna(
        id=uuid4(),
        email="admin@example.test",
        peran="admin",
        apakah_aktif=True,
    )


async def _fake_db():
    return object()


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    app.dependency_overrides.clear()
    yield
    app.dependency_overrides.clear()


def test_admin_document_preview_returns_pdf_file(tmp_path, monkeypatch):
    pdf_path = tmp_path / "dokumen-str.pdf"
    pdf_path.write_bytes(b"%PDF-1.4\n% test pdf\n")
    audit_events = []

    async def fake_get_psikolog_by_id(*, db, id_psikolog):
        return SimpleNamespace(
            upload_dokumen_str="psikolog-documents/dokumen-str.pdf",
            upload_dokumen_sip="psikolog-documents/dokumen-sip.pdf",
        )

    def fake_resolve_document(relative_path: str | None) -> Path | None:
        if relative_path == "psikolog-documents/dokumen-str.pdf":
            return pdf_path
        return None

    async def fake_record_audit_log(*_args, **kwargs):
        audit_events.append(kwargs)

    monkeypatch.setattr(admin_router, "get_psikolog_by_id", fake_get_psikolog_by_id)
    monkeypatch.setattr(admin_router, "resolve_psikolog_document", fake_resolve_document)
    monkeypatch.setattr(admin_router, "record_audit_log", fake_record_audit_log)
    app.dependency_overrides[get_current_active_admin] = _admin_user
    app.dependency_overrides[get_db] = _fake_db

    client = TestClient(app)
    response = client.get("/api/admin/psikolog/1/documents/str")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "inline" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF-")
    assert len(audit_events) == 1
    assert audit_events[0]["action"] == "admin_preview_psikolog_document"
    assert audit_events[0]["target_type"] == "psikolog"
    assert audit_events[0]["target_id"] == 1
    assert audit_events[0]["metadata"] == {"document_type": "str"}


def test_admin_document_preview_returns_404_when_file_missing(monkeypatch):
    async def fake_get_psikolog_by_id(*, db, id_psikolog):
        return SimpleNamespace(
            upload_dokumen_str="psikolog-documents/missing-str.pdf",
            upload_dokumen_sip="psikolog-documents/missing-sip.pdf",
        )

    monkeypatch.setattr(admin_router, "get_psikolog_by_id", fake_get_psikolog_by_id)
    monkeypatch.setattr(admin_router, "resolve_psikolog_document", lambda _path: None)
    monkeypatch.setattr(admin_router, "record_audit_log", lambda *_args, **_kwargs: None)
    app.dependency_overrides[get_current_active_admin] = _admin_user
    app.dependency_overrides[get_db] = _fake_db

    client = TestClient(app)
    response = client.get("/api/admin/psikolog/1/documents/sip")

    assert response.status_code == 404
    assert response.json()["detail"] == "File dokumen belum tersedia di server"


def test_admin_document_preview_requires_active_admin_dependency(monkeypatch):
    async def fake_forbidden_admin():
        raise HTTPException(status_code=403, detail="Admin required")

    async def fake_get_psikolog_by_id(*, db, id_psikolog):
        raise AssertionError("Endpoint tidak boleh membaca dokumen tanpa admin aktif")

    monkeypatch.setattr(admin_router, "get_psikolog_by_id", fake_get_psikolog_by_id)
    app.dependency_overrides[get_current_active_admin] = fake_forbidden_admin
    app.dependency_overrides[get_db] = _fake_db

    client = TestClient(app)
    response = client.get("/api/admin/psikolog/1/documents/str")

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin required"
