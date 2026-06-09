from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from api.core.config import settings
from api.core.logging_config import setup_logging
from api.core.rate_limit import limiter
from api.routers import admin, auth, booking, dashboard, jadwal, journal, konsultasi, pembayaran, pre_assessment
from api.services.booking_reminder_scheduler import booking_reminder_scheduler

# from api.routers import journal, pre_assessment, booking, konsultasi, pembayaran, admin

setup_logging()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await booking_reminder_scheduler.start()
    try:
        yield
    finally:
        await booking_reminder_scheduler.stop()


app = FastAPI(
    title=settings.APP_NAME,
    description="CogniScan Backend API - Mental Health AI Companion",
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=(
        r"^https?://("
        r"localhost|127\.0\.0\.1|\[::1\]|"
        r"10\.\d{1,3}\.\d{1,3}\.\d{1,3}|"
        r"192\.168\.\d{1,3}\.\d{1,3}|"
        r"172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}"
        r"):\d+$"
    )
    if settings.DEBUG
    else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SlowAPIMiddleware)


@app.get("/", tags=["Health Check"])
async def read_root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "environment": settings.APP_ENV,
    }


@app.get("/healthz", tags=["Health Check"], include_in_schema=False)
async def healthz():
    return {"status": "ok"}


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(journal.router, prefix="/api/journal", tags=["Journaling"])
app.include_router(booking.router, prefix="/api/booking", tags=["Booking"])
app.include_router(jadwal.router, prefix="/api/jadwal", tags=["Jadwal"])
app.include_router(konsultasi.router, prefix="/api/konsultasi", tags=["Konsultasi"])
app.include_router(pembayaran.router, prefix="/api/pembayaran", tags=["Pembayaran"])
app.include_router(
    pre_assessment.router,
    prefix="/api/pre-assessment",
    tags=["Pre-Assessment"],
)

# app.include_router(pre_assessment.router, prefix="/api/pre-assessment", tags=["Pre-Assessment"])
# app.include_router(journal.router, prefix="/api/journal", tags=["Journaling"])
