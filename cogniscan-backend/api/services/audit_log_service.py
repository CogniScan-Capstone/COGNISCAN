from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession

from api.models.audit_log import AuditLog
from api.models.pengguna import Pengguna


def _json_safe(value):
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    if isinstance(value, UUID | datetime | date | Decimal):
        return str(value)
    return value


def _request_ip(request: Request | None) -> str | None:
    if request is None or request.client is None:
        return None

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",", maxsplit=1)[0].strip()

    return request.client.host


async def record_audit_log(
    db: AsyncSession,
    *,
    action: str,
    actor: Pengguna | None = None,
    target_type: str | None = None,
    target_id: int | str | UUID | None = None,
    outcome: str = "success",
    request: Request | None = None,
    metadata: dict | None = None,
    commit: bool = False,
) -> AuditLog:
    """Catat aktivitas sensitif tanpa menyimpan payload klinis mentah."""
    audit_log = AuditLog(
        id_aktor=actor.id if actor else None,
        email_aktor=actor.email if actor else None,
        peran_aktor=actor.peran if actor else None,
        aksi=action,
        target_tipe=target_type,
        target_id=str(target_id) if target_id is not None else None,
        status=outcome,
        ip_address=_request_ip(request),
        user_agent=request.headers.get("user-agent") if request else None,
        metadata_json=_json_safe(metadata) if metadata else None,
    )
    db.add(audit_log)
    await db.flush()

    if commit:
        await db.commit()

    return audit_log
