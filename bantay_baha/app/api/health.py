from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.snapshot_store import check_snapshot_storage

router = APIRouter(tags=["health"])


@router.get("/health")
def liveness():
    return {"status": "ok", "service": "bantay-baha", "timestamp": datetime.now(UTC).isoformat()}


@router.get("/readiness")
def readiness(db: Session = Depends(get_db)):
    checks: dict = {}
    ok = True
    # DB check
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {e}"
        ok = False
    # snapshot dir writable
    try:
        check_snapshot_storage(db)
        checks["storage"] = "ok"
    except Exception as e:
        checks["storage"] = f"error: {e}"
        ok = False
    # migrations check — compare heads? simplified: try to query source_registry table
    try:
        db.execute(text("SELECT COUNT(*) FROM source_registry"))
        checks["migrations"] = "ok"
    except Exception as e:
        checks["migrations"] = f"error: {e}"
        ok = False

    status = 200 if ok else 503
    return JSONResponse(status_code=status, content={"ready": ok, "checks": checks, "timestamp": datetime.now(UTC).isoformat()})
