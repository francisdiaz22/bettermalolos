from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.internal import router as ops_router
from app.config import get_settings
from app.logging_config import setup_logging

settings = get_settings()
setup_logging(settings.log_level)

# Fail fast if ops auth is missing in staging/production (audit G9)
if settings.app_env in ("staging", "production") and not settings.ops_api_token:
    raise RuntimeError("OPS_API_TOKEN must be set in staging/production — refusing to start with unauthenticated ops routes")

app = FastAPI(
    title="Bantay Baha — Internal Ops (Phase A)",
    description="Decision-support ingestion service. Not an official forecast.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(ops_router)


@app.get("/")
def root():
    return {
        "service": "bantay-baha",
        "phase": "A — foundations (internal only)",
        "docs": "/docs",
        "health": "/health",
        "readiness": "/readiness",
        "ops": "/v1/ops/health/sources",
        "disclaimer": "Community indicator, not an official flood forecast.",
    }
