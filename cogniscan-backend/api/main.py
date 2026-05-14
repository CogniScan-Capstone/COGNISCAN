from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.core.config import settings
from api.core.logging_config import setup_logging
from api.routers import admin, auth

# from api.routers import journal, pre_assessment, booking, konsultasi, pembayaran, admin

setup_logging()

app = FastAPI(
    title=settings.APP_NAME,
    description="CogniScan Backend API - Mental Health AI Companion",
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["Health Check"])
async def read_root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "environment": settings.APP_ENV,
    }


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])

# app.include_router(pre_assessment.router, prefix="/api/pre-assessment", tags=["Pre-Assessment"])
# app.include_router(journal.router, prefix="/api/journal", tags=["Journaling"])
