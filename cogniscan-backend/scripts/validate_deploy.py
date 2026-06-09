from __future__ import annotations

import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from dotenv import dotenv_values


BASE_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = BASE_DIR / ".env"

REQUIRED_VARS = (
    "GEMINI_API_KEY",
    "DATABASE_URL",
    "DATABASE_URL_SYNC",
    "JWT_SECRET_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
)

PLACEHOLDER_MARKERS = (
    "your-",
    "project-ref",
    "example.com",
    "your_",
    "change-me",
)


def _load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    if ENV_FILE.exists():
        for key, value in dotenv_values(ENV_FILE).items():
            if value is not None:
                values[key] = value

    for key, value in os.environ.items():
        values[key] = value
    return values


def _bool_value(raw: str | None, default: bool = False) -> bool:
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _has_placeholder(value: str) -> bool:
    lowered = value.lower()
    return any(marker in lowered for marker in PLACEHOLDER_MARKERS)


def _check_database_urls(env: dict[str, str], errors: list[str], warnings: list[str]) -> None:
    runtime_url = env.get("DATABASE_URL", "")
    migration_url = env.get("DATABASE_URL_SYNC", "")

    runtime = urlparse(runtime_url)
    if runtime.scheme != "postgresql":
        errors.append("DATABASE_URL harus memakai scheme postgresql://")
    if runtime.port and runtime.port != 6543:
        warnings.append("DATABASE_URL biasanya memakai Supabase Transaction Pooler port 6543")
    runtime_query = parse_qs(runtime.query)
    if runtime_query.get("pgbouncer") != ["true"]:
        warnings.append("DATABASE_URL sebaiknya menyertakan ?pgbouncer=true untuk pooler Supabase")

    migration = urlparse(migration_url)
    if migration.scheme != "postgresql":
        errors.append("DATABASE_URL_SYNC harus memakai scheme postgresql://")
    if migration.port and migration.port != 5432:
        warnings.append("DATABASE_URL_SYNC biasanya memakai Supabase direct connection port 5432")
    if "pgbouncer=true" in migration_url:
        errors.append("DATABASE_URL_SYNC tidak boleh memakai pooler/pgbouncer")


def main() -> int:
    env = _load_env()
    errors: list[str] = []
    warnings: list[str] = []

    for name in REQUIRED_VARS:
        value = env.get(name, "").strip()
        if not value:
            errors.append(f"{name} belum di-set")
        elif _has_placeholder(value):
            errors.append(f"{name} masih berisi placeholder")

    if env.get("SUPABASE_URL", "").rstrip("/").endswith(("/rest/v1", "/auth/v1")):
        warnings.append("SUPABASE_URL sebaiknya base URL project saja, tanpa /rest/v1 atau /auth/v1")

    if env.get("CORS_ORIGINS", "").strip() == "":
        errors.append("CORS_ORIGINS wajib diisi dengan URL frontend deploy")
    elif _has_placeholder(env.get("CORS_ORIGINS", "")):
        errors.append("CORS_ORIGINS masih berisi placeholder")

    if env.get("DATABASE_URL") and env.get("DATABASE_URL_SYNC"):
        _check_database_urls(env, errors, warnings)

    app_env = env.get("APP_ENV", "development").lower()
    is_production = app_env in {"prod", "production"}
    if not is_production:
        warnings.append("APP_ENV belum production")

    if _bool_value(env.get("DEBUG"), default=False):
        warnings.append("DEBUG=true tidak disarankan untuk production")
    if _bool_value(env.get("RELOAD"), default=False):
        warnings.append("RELOAD=true tidak boleh dipakai untuk production")
    if _bool_value(env.get("SQL_ECHO"), default=False):
        errors.append("SQL_ECHO=true tidak aman untuk data pasien nyata")

    cors_origins = env.get("CORS_ORIGINS", "")
    if is_production and ("localhost" in cors_origins or "127.0.0.1" in cors_origins):
        warnings.append("CORS_ORIGINS production masih memuat localhost")

    single_instance = _bool_value(env.get("DEPLOYMENT_SINGLE_INSTANCE"), default=True)
    rate_limit_storage = env.get("RATE_LIMIT_STORAGE_URL", "memory://").lower()
    if is_production and rate_limit_storage.startswith("memory") and not single_instance:
        warnings.append("RATE_LIMIT_STORAGE_URL memory:// hanya cocok untuk single instance")

    if (
        _bool_value(env.get("BOOKING_REMINDER_SCHEDULER_ENABLED"), default=False)
        and not single_instance
    ):
        warnings.append("Scheduler reminder aktif; pastikan deployment hanya single instance atau pakai worker/cron tunggal")

    midtrans_production = _bool_value(env.get("MIDTRANS_IS_PRODUCTION"), default=False)
    midtrans_server_key = env.get("MIDTRANS_SERVER_KEY", "")
    midtrans_client_key = env.get("MIDTRANS_CLIENT_KEY", "")
    if midtrans_production and (
        midtrans_server_key.startswith("SB-") or midtrans_client_key.startswith("SB-")
    ):
        errors.append("MIDTRANS_IS_PRODUCTION=true tidak boleh memakai sandbox key SB-*")
    if midtrans_production:
        if not midtrans_server_key or not midtrans_client_key:
            errors.append("MIDTRANS production membutuhkan MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY")
        elif _has_placeholder(midtrans_server_key) or _has_placeholder(midtrans_client_key):
            errors.append("Midtrans production key masih berisi placeholder")

    for message in errors:
        print(f"[FAIL] {message}")
    for message in warnings:
        print(f"[WARN] {message}")

    if errors:
        print("\nDeploy check gagal. Perbaiki [FAIL] sebelum deploy.")
        return 1

    print("[OK] Konfigurasi deploy dasar valid.")
    if warnings:
        print("Review [WARN] sebelum production traffic.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
