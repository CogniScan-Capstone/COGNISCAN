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
    created: bool = False


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


def _extract_user(payload: dict, *, created: bool = False) -> SupabaseAuthUser:
    user_payload = payload.get("user") if isinstance(payload.get("user"), dict) else payload
    user_id = user_payload.get("id")
    email = user_payload.get("email")
    if not user_id or not email:
        raise SupabaseAuthAdminError("Response Supabase Auth tidak memuat user id/email")
    return SupabaseAuthUser(id=UUID(user_id), email=email, created=created)


def _is_duplicate_email_error(message: str) -> bool:
    lowered = message.lower()
    return "already been registered" in lowered or "already registered" in lowered


def _extract_role(user_payload: dict) -> str | None:
    app_metadata = user_payload.get("app_metadata")
    user_metadata = user_payload.get("user_metadata")

    if isinstance(app_metadata, dict) and isinstance(app_metadata.get("peran"), str):
        return app_metadata["peran"]

    if isinstance(user_metadata, dict) and isinstance(user_metadata.get("peran"), str):
        return user_metadata["peran"]

    return None


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

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(
                f"{supabase_url}/auth/v1/admin/users",
                headers=_headers(service_role_key),
                json=payload,
            )
    except httpx.RequestError as exc:
        raise SupabaseAuthAdminError(
            f"Tidak bisa menghubungi Supabase Auth Admin API: {exc}"
        ) from exc

    if response.status_code >= 400:
        error_message = _error_message(response)
        if _is_duplicate_email_error(error_message):
            return await reuse_existing_psikolog_user_with_temporary_password(
                email=email,
                temporary_password=temporary_password,
                nama_lengkap=nama_lengkap,
            )
        raise SupabaseAuthAdminError(error_message)

    return _extract_user(response.json(), created=True)


async def find_user_by_email(email: str) -> dict | None:
    """Cari user Supabase Auth berdasarkan email untuk memulihkan approval yang rollback."""
    supabase_url, service_role_key = _require_config()
    normalized_email = email.lower()

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                f"{supabase_url}/auth/v1/admin/users",
                headers=_headers(service_role_key),
                params={"page": 1, "per_page": 1000},
            )
    except httpx.RequestError as exc:
        raise SupabaseAuthAdminError(
            f"Tidak bisa menghubungi Supabase Auth Admin API: {exc}"
        ) from exc

    if response.status_code >= 400:
        raise SupabaseAuthAdminError(_error_message(response))

    payload = response.json()
    users = payload.get("users") if isinstance(payload, dict) else payload
    if not isinstance(users, list):
        raise SupabaseAuthAdminError("Response Supabase Auth tidak memuat daftar users")

    for user in users:
        if isinstance(user, dict) and str(user.get("email", "")).lower() == normalized_email:
            return user

    return None


async def reuse_existing_psikolog_user_with_temporary_password(
    *,
    email: str,
    temporary_password: str,
    nama_lengkap: str,
) -> SupabaseAuthUser:
    """
    Reuse user Supabase Auth yang sudah sempat dibuat tetapi DB lokal rollback.

    Hanya user yang role metadata-nya kosong atau psikolog yang boleh direuse,
    supaya email pasien/admin tidak diam-diam dikonversi menjadi psikolog.
    """
    existing_user = await find_user_by_email(email)
    if existing_user is None:
        raise SupabaseAuthAdminError(
            "Email sudah terdaftar di Supabase Auth, tetapi user tidak ditemukan saat dicari ulang"
        )

    existing_role = _extract_role(existing_user)
    if existing_role and existing_role != "psikolog":
        raise SupabaseAuthAdminError(
            f"Email sudah terdaftar di Supabase Auth sebagai role {existing_role}"
        )

    user_id = existing_user.get("id")
    if not user_id:
        raise SupabaseAuthAdminError("User Supabase Auth tidak memuat id")

    await update_user_temporary_password_for_psikolog(
        user_id=UUID(user_id),
        temporary_password=temporary_password,
        nama_lengkap=nama_lengkap,
    )
    return SupabaseAuthUser(id=UUID(user_id), email=email.lower(), created=False)


async def update_user_temporary_password_for_psikolog(
    *,
    user_id: UUID,
    temporary_password: str,
    nama_lengkap: str,
) -> None:
    supabase_url, service_role_key = _require_config()

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.put(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                headers=_headers(service_role_key),
                json={
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
                },
            )
    except httpx.RequestError as exc:
        raise SupabaseAuthAdminError(
            f"Tidak bisa menghubungi Supabase Auth Admin API: {exc}"
        ) from exc

    if response.status_code >= 400:
        raise SupabaseAuthAdminError(_error_message(response))


async def update_user_password(*, user_id: UUID, new_password: str) -> None:
    """Update password Supabase Auth untuk user tertentu via Admin API."""
    supabase_url, service_role_key = _require_config()

    try:
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
    except httpx.RequestError as exc:
        raise SupabaseAuthAdminError(
            f"Tidak bisa menghubungi Supabase Auth Admin API: {exc}"
        ) from exc

    if response.status_code >= 400:
        raise SupabaseAuthAdminError(_error_message(response))


async def delete_user(user_id: UUID) -> None:
    """Hapus user Supabase Auth. Dipakai untuk rollback best-effort."""
    supabase_url, service_role_key = _require_config()

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.delete(
                f"{supabase_url}/auth/v1/admin/users/{user_id}",
                headers=_headers(service_role_key),
            )
    except httpx.RequestError as exc:
        raise SupabaseAuthAdminError(
            f"Tidak bisa menghubungi Supabase Auth Admin API: {exc}"
        ) from exc

    if response.status_code >= 400:
        raise SupabaseAuthAdminError(_error_message(response))
