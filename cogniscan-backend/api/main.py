from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.config import settings
from api.routers import auth
# from api.routers import journal, pre_assessment, booking, konsultasi, pembayaran, admin

app = FastAPI(
    title=settings.APP_NAME,
    description="CogniScan Backend API - Mental Health AI Companion",
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

# ── CORS Middleware ────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Root Endpoints ─────────────────────────────────────────
@app.get("/", tags=["Health Check"])
async def read_root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "environment": settings.APP_ENV
    }

# Endpoint deteksi sementara dari prototype (nantinya dipindah ke router)
from analyzer.main import analyze_narrative

@app.post("/api/deteksi-kognitif", tags=["AI Analyzer"])
async def deteksi_teks(teks_user: str):
    """
    Endpoint legacy untuk pengujian awal AI Analyzer.
    Akan dipindahkan ke service/router pre-assessment.
    """
    hasil_ai = analyze_narrative(teks_user)
    return hasil_ai

# ── Register Routers ───────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
# app.include_router(pre_assessment.router, prefix="/api/pre-assessment", tags=["Pre-Assessment"])
# app.include_router(journal.router, prefix="/api/journal", tags=["Journaling"])