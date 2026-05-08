# CogniScan Backend

FastAPI backend for CogniScan mental health screening application.

## Stack

- FastAPI 0.115 (async web framework)
- SQLAlchemy 2.0 async (ORM)
- Supabase (managed PostgreSQL 16)
- Alembic (database migrations)
- Google Gemini 2.5 Flash (via Vertex AI)
- Anaconda (environment management)

## Quick Start

```bash
# Activate environment
conda activate cogniscan-backend

# Verify setup
python test_setup.py

# Run development server (after Phase 4)
# uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

Then open:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Database

Supabase PostgreSQL 16 (managed).

- DATABASE_URL: Transaction pooler (port 6543) for FastAPI runtime
- DATABASE_URL_SYNC: Direct connection (port 5432) for Alembic migrations

## Status

- [x] Folder restructure (cogniscan-backend/)
- [x] Anaconda environment setup
- [x] Dependencies installed
- [x] Supabase database connected
- [x] Smoke test passed
- [ ] SQLAlchemy models (next phase)
- [ ] FastAPI app structure (next phase)
- [ ] Authentication endpoints
- [ ] Journal session endpoints
- [ ] Analyze endpoint (wrap analyzer)
- [ ] Pre-Assessment endpoints
- [ ] Booking endpoints
