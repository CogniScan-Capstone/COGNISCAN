# CogniScan Backend Deployment

Backend ini adalah FastAPI app. Jalankan semua command dari folder
`cogniscan-backend`.

## Runtime

- Python: 3.11
- Build command: `pip install -r requirements.txt`
- Start command: `python start.py`
- Health check: `/healthz`
- OpenAPI docs: `/docs`

Untuk platform yang memakai Procfile, file `Procfile` sudah berisi:

```text
web: python start.py
```

Untuk Docker:

```bash
docker build -t cogniscan-backend .
docker run --env-file .env -p 8000:8000 cogniscan-backend
```

## Environment

Gunakan `.env.production.example` sebagai checklist environment variable.
Jangan deploy memakai `.env.example` lokal apa adanya.

Minimum variable yang wajib ada:

```text
GEMINI_API_KEY
DATABASE_URL
DATABASE_URL_SYNC
JWT_SECRET_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
CORS_ORIGINS
```

Set production baseline:

```text
APP_ENV=production
DEBUG=false
SQL_ECHO=false
RELOAD=false
HOST=0.0.0.0
```

`PORT` biasanya diisi otomatis oleh deployment provider. Jika tidak, gunakan
`PORT=8000`.

Untuk GCP single instance, gunakan:

```text
DEPLOYMENT_SINGLE_INSTANCE=true
RATE_LIMIT_STORAGE_URL=memory://
```

Jika memakai Cloud Run, set maximum instance service ke `1`. Dengan konfigurasi
ini Redis tidak diperlukan; rate limit berjalan di memori instance tersebut dan
akan reset saat instance restart.

## Database And Migrations

`DATABASE_URL` dipakai FastAPI runtime dan harus menggunakan Supabase
Transaction Pooler port `6543` dengan `?pgbouncer=true`.

`DATABASE_URL_SYNC` dipakai Alembic dan harus menggunakan direct connection
port `5432`.

Jalankan migration sebelum membuka traffic:

```bash
alembic upgrade head
alembic current
```

## Frontend Integration

Set backend:

```text
CORS_ORIGINS=https://your-frontend-domain.example
FRONTEND_LOGIN_URL=https://your-frontend-domain.example/sign-in
MIDTRANS_FINISH_URL=https://your-frontend-domain.example/pasien/booking/receipt/detail
```

Set frontend:

```text
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.example
```

## Production Notes

- `RATE_LIMIT_STORAGE_URL=memory://` cukup untuk GCP single instance.
- Jika nanti scale ke multi-instance, gunakan storage terpusat seperti
  Memorystore Redis dan set `DEPLOYMENT_SINGLE_INSTANCE=false`.
- Keep `BOOKING_REMINDER_SCHEDULER_ENABLED=false` if more than one backend
  instance can run. Use one worker or external cron for reminders.
- Use persistent storage or object storage for `FILE_STORAGE_DIR` if uploaded
  psikolog documents must survive restarts.
- Do not expose WAHA dashboard/API publicly without authentication.
- Match Midtrans environment and keys. Production keys must not start with
  `SB-`.

## Preflight Check

Run this locally or in CI after environment variables are configured:

```bash
python scripts/validate_deploy.py
python -m compileall api analyzer scripts start.py
```
