from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

import httpx

from api.core.config import settings


class SupabaseAuthAdminError(Exception):
    """Error saat memanggil Supabase Auth Admin API."""


class SupabaseAuthAdminNotConfiguredError(SupabaseAuthAdminError):
    """Supabase Auth Admin belum dikonfigurasi di environment."""


@dataclass(frozen=True)
class SupabaseAuthUser:
    id: UUID
    email: str


def _require_config() -> tuple[str, str]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseAuthAdminNotConfiguredError(
            "SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib di-set untuk approval psikolog"
        )

    supabase_url = settings.SUPABASE_URL.strip().rstrip("/")
    for suffix in ("/rest/v1", "/auth/v1"):
        if supabase_url.endswith(suffix):
            supabase_url = supabase_url[: -len(suffix)]

    return supabase_url, settings.SUPABASE_SERVICE_ROLE_KEY


def _headers(service_role_key: str) -> dict[str, str]:
    return {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }


def _extract_user(payload: dict) -> SupabaseAuthUser:
    user_payload = payload.get("user") if isinstance(payload.get("user"), dict) else payload
    user_id = user_payload.get("id")
    email = user_payload.get("email")
    if not user_id or not email:
        raise SupabaseAuthAdminError("Response Supabase Auth tidak memuat user id/email")
    return SupabaseAuthUser(id=UUID(user_id), email=email)


def _error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text
    return (
        payload.get("msg")
        or payload.get("message")
        or payload.get("error_description")
        or payload.get("error")
        or str(payload)
    )


async def create_user_with_temporary_password(
    *,
    email: str,
    temporary_password: str,
    nama_lengkap: str,
) -> SupabaseAuthUser:
    """Buat user Supabase Auth untuk psikolog yang sudah di-approve admin."""
    supabase_url, service_role_key = _require_config()
    payload = {
        "email": email,
        "password": temporary_password,
        "email_confirm": True,
        "user_metadata": {
            "nama_lengkap": nama_lengkap,
            "peran": "psikolog",
            "must_change_password": True,
        },
        "app_metadata": {
            "peran": "psikolog",
        },
    }

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{supabase_url}/auth/v1/admin/users",
            headers=_headers(service_role_key),
            json=payload,
        )

    if response.status_code >= 400:
        raise SupabaseAuthAdminError(_error_message(response))

    return _extract_user(response.json())


async def update_user_password(*, user_id: UUID, new_password: str) -> None:
    """Update password Supabase Auth untuk user tertentu via Admin API."""
    supabase_url, service_role_key = _require_config()

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.put(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers=_headers(service_role_key),
            json={
                "password": new_password,
                "user_metadata": {
                    "must_change_password": False,
                },
            },
        )

    if response.status_code >= 400:
        raise SupabaseAuthAdminError(_error_message(response))


async def delete_user(user_id: UUID) -> None:
    """Hapus user Supabase Auth. Dipakai untuk rollback best-effort."""
    supabase_url, service_role_key = _require_config()

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.delete(
            f"{supabase_url}/auth/v1/admin/users/{user_id}",
            headers=_headers(service_role_key),
        )

    if response.status_code >= 400:
        raise SupabaseAuthAdminError(_error_message(response))
