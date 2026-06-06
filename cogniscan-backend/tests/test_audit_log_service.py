from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
from starlette.requests import Request

from api.models.pengguna import Pengguna
from api.services.audit_log_service import record_audit_log


class _FakeDb:
    def __init__(self):
        self.added = []
        self.flushes = 0
        self.commits = 0

    def add(self, obj):
        self.added.append(obj)

    async def flush(self):
        self.flushes += 1

    async def commit(self):
        self.commits += 1


def _request() -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/api/admin/psikolog/1/documents/str",
            "headers": [
                (b"user-agent", b"pytest-client"),
                (b"x-forwarded-for", b"203.0.113.10, 10.0.0.1"),
            ],
            "client": ("127.0.0.1", 54321),
        }
    )


@pytest.mark.asyncio
async def test_record_audit_log_captures_actor_request_and_safe_metadata():
    actor_id = uuid4()
    actor = Pengguna(
        id=actor_id,
        email="admin@example.test",
        peran="admin",
        apakah_aktif=True,
    )
    db = _FakeDb()

    audit_log = await record_audit_log(
        db,
        actor=actor,
        action="admin_preview_psikolog_document",
        target_type="psikolog",
        target_id=7,
        request=_request(),
        metadata={
            "document_type": "str",
            "amount": Decimal("150000"),
            "checked_at": datetime(2026, 6, 6, 12, 0, tzinfo=timezone.utc),
            "day": date(2026, 6, 6),
        },
        commit=True,
    )

    assert db.added == [audit_log]
    assert db.flushes == 1
    assert db.commits == 1
    assert audit_log.id_aktor == actor_id
    assert audit_log.email_aktor == "admin@example.test"
    assert audit_log.peran_aktor == "admin"
    assert audit_log.aksi == "admin_preview_psikolog_document"
    assert audit_log.target_tipe == "psikolog"
    assert audit_log.target_id == "7"
    assert audit_log.status == "success"
    assert audit_log.ip_address == "203.0.113.10"
    assert audit_log.user_agent == "pytest-client"
    assert audit_log.metadata_json == {
        "document_type": "str",
        "amount": "150000",
        "checked_at": "2026-06-06 12:00:00+00:00",
        "day": "2026-06-06",
    }


@pytest.mark.asyncio
async def test_record_audit_log_allows_system_actor_without_commit():
    db = _FakeDb()

    audit_log = await record_audit_log(
        db,
        action="midtrans_webhook_processed",
        target_type="transaksi_pembayaran",
        target_id="CGS-TEST-001",
        metadata={"status_transaksi": "berhasil"},
    )

    assert audit_log.id_aktor is None
    assert audit_log.email_aktor is None
    assert audit_log.peran_aktor is None
    assert audit_log.target_id == "CGS-TEST-001"
    assert audit_log.metadata_json == {"status_transaksi": "berhasil"}
    assert db.flushes == 1
    assert db.commits == 0
