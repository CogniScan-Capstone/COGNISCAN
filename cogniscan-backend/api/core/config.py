"""
Konfigurasi aplikasi CogniScan menggunakan Pydantic Settings.
Load otomatis dari file .env di folder cogniscan-backend/.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Konfigurasi utama aplikasi, di-load dari environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # abaikan env vars yang tidak didefinisikan di sini
    )

    # ── Google Cloud / Gemini ──────────────────────────────
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3-flash"

    # ── Database (Supabase) ────────────────────────────────
    # Transaction Pooler (port 6543) → untuk FastAPI runtime
    DATABASE_URL: str

    # Direct Connection (port 5432) → untuk Alembic migrations
    DATABASE_URL_SYNC: str

    # ── JWT / Authentication ───────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Supabase Auth Admin API. SERVICE_ROLE_KEY hanya boleh dipakai server-side.
    SUPABASE_URL: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None
    TEMP_PASSWORD_LENGTH: int = 20

    # ── Application ────────────────────────────────────────
    APP_NAME: str = "CogniScan API"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # ── Server ─────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True

    # ── CORS ───────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000"

    # SMTP untuk email aktivasi psikolog dan temporary password.
    SMTP_HOST: str | None = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: str | None = None
    SMTP_PASSWORD: str | None = None
    SMTP_SENDER_EMAIL: str | None = None
    SMTP_USE_TLS: bool = True
    FRONTEND_LOGIN_URL: str = "http://localhost:3000/sign-in"

    # Midtrans Snap payment gateway. SERVER_KEY hanya boleh dipakai backend.
    MIDTRANS_SERVER_KEY: str | None = None
    MIDTRANS_CLIENT_KEY: str | None = None
    MIDTRANS_IS_PRODUCTION: bool = False
    MIDTRANS_SNAP_BASE_URL: str = "https://app.sandbox.midtrans.com"
    MIDTRANS_API_BASE_URL: str = "https://api.sandbox.midtrans.com"
    MIDTRANS_FINISH_URL: str = "http://localhost:3000/pasien/booking/receipt/detail"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS_ORIGINS string menjadi list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def async_database_url(self) -> str:
        """
        Konversi DATABASE_URL ke format asyncpg.
        Input:  postgresql://user:pass@host:port/db
        Output: postgresql+asyncpg://user:pass@host:port/db
        """
        url = self.DATABASE_URL
        if "?pgbouncer=true" in url:
            url = url.replace("?pgbouncer=true", "")
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def midtrans_snap_transactions_url(self) -> str:
        return f"{self.MIDTRANS_SNAP_BASE_URL.rstrip('/')}/snap/v1/transactions"

    @property
    def midtrans_snap_script_url(self) -> str:
        return f"{self.MIDTRANS_SNAP_BASE_URL.rstrip('/')}/snap/snap.js"

    @property
    def midtrans_is_configured(self) -> bool:
        return bool(self.MIDTRANS_SERVER_KEY and self.MIDTRANS_CLIENT_KEY)

    @property
    def midtrans_environment_error(self) -> str | None:
        """Validate that key prefixes match the selected Midtrans environment."""
        server_key = self.MIDTRANS_SERVER_KEY or ""
        client_key = self.MIDTRANS_CLIENT_KEY or ""

        if not server_key or not client_key:
            return "MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY wajib diisi"

        server_is_sandbox_prefix = server_key.startswith("SB-Mid-server-")
        client_is_sandbox_prefix = client_key.startswith("SB-Mid-client-")
        
        server_is_valid_prefix = server_key.startswith("Mid-server-") or server_is_sandbox_prefix
        client_is_valid_prefix = client_key.startswith("Mid-client-") or client_is_sandbox_prefix

        if not server_is_valid_prefix or not client_is_valid_prefix:
            return "Format MIDTRANS_SERVER_KEY atau MIDTRANS_CLIENT_KEY tidak valid"

        if self.MIDTRANS_IS_PRODUCTION:
            if server_is_sandbox_prefix or client_is_sandbox_prefix:
                return (
                    "MIDTRANS_IS_PRODUCTION=true tidak boleh menggunakan "
                    "sandbox key yang diawali SB-"
                )

        return None


# Singleton — import ini dari file lain
settings = Settings()  # trigger reload
