import asyncio
import os
from uuid import UUID

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from api.core.config import settings


ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@cogniscan.local")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "Admin12345!")
ADMIN_NAME = os.getenv("ADMIN_NAME", "Admin CogniScan")


def normalized_supabase_url() -> str:
    supabase_url = (settings.SUPABASE_URL or "").strip().rstrip("/")
    for suffix in ("/rest/v1", "/auth/v1"):
        if supabase_url.endswith(suffix):
            return supabase_url[: -len(suffix)]
    return supabase_url


def auth_headers() -> dict[str, str]:
    return {
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY or "",
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
        "Content-Type": "application/json",
    }


async def create_or_update_supabase_admin() -> UUID:
    supabase_url = normalized_supabase_url()

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            f"{supabase_url}/auth/v1/admin/users",
            headers=auth_headers(),
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "email_confirm": True,
                "user_metadata": {
                    "nama_lengkap": ADMIN_NAME,
                    "peran": "admin",
                },
                "app_metadata": {
                    "peran": "admin",
                },
            },
        )

        if response.status_code < 400:
            return UUID(response.json()["id"])

        users_response = await client.get(
            f"{supabase_url}/auth/v1/admin/users",
            headers=auth_headers(),
            params={"page": 1, "per_page": 1000},
        )
        users_response.raise_for_status()

        for user in users_response.json().get("users", []):
            if user.get("email", "").lower() == ADMIN_EMAIL.lower():
                user_id = UUID(user["id"])
                update_response = await client.put(
                    f"{supabase_url}/auth/v1/admin/users/{user_id}",
                    headers=auth_headers(),
                    json={
                        "password": ADMIN_PASSWORD,
                        "email_confirm": True,
                        "user_metadata": {
                            "nama_lengkap": ADMIN_NAME,
                            "peran": "admin",
                        },
                        "app_metadata": {
                            "peran": "admin",
                        },
                    },
                )
                update_response.raise_for_status()
                return user_id

        raise RuntimeError(response.text)


async def main() -> None:
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise RuntimeError("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib ada di .env")

    user_id = await create_or_update_supabase_admin()

    engine = create_async_engine(settings.async_database_url)
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with session_factory() as session:
        await session.execute(
            text(
                """
                INSERT INTO pengguna (id, email, peran, apakah_aktif)
                VALUES (:id, :email, 'admin', true)
                ON CONFLICT (id) DO UPDATE
                SET email = EXCLUDED.email,
                    peran = 'admin',
                    apakah_aktif = true
                """
            ),
            {"id": user_id, "email": ADMIN_EMAIL},
        )

        await session.execute(
            text(
                """
                UPDATE admin
                SET nama_lengkap = :nama,
                    email = :email
                WHERE id_pengguna = :id
                """
            ),
            {"id": user_id, "nama": ADMIN_NAME, "email": ADMIN_EMAIL},
        )

        await session.execute(
            text(
                """
                INSERT INTO admin (id_pengguna, nama_lengkap, email)
                SELECT :id, :nama, :email
                WHERE NOT EXISTS (
                    SELECT 1 FROM admin WHERE id_pengguna = :id
                )
                """
            ),
            {"id": user_id, "nama": ADMIN_NAME, "email": ADMIN_EMAIL},
        )

        await session.commit()

    await engine.dispose()

    print("Admin berhasil dibuat")
    print(f"Email: {ADMIN_EMAIL}")


if __name__ == "__main__":
    asyncio.run(main())
