from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Observation, SourceRegistry, SourceSnapshot, Station
from app.services.freshness import compute_freshness, freshness_for_source

router = APIRouter(prefix="/v1/ops", tags=["ops"])


def _require_token(x_ops_token: str | None = Header(default=None), authorization: str | None = Header(default=None)):
    settings = get_settings()
    if not settings.ops_api_token:
        # Enforce auth outside development/test — production/staging must set OPS_API_TOKEN
        if settings.app_env in ("staging", "production"):
            raise HTTPException(status_code=503, detail="OPS_API_TOKEN not configured — ops API disabled")
        return  # no auth required in dev/test if not set
    token = x_ops_token or (authorization.removeprefix("Bearer ").strip() if authorization else None)
    if token != settings.ops_api_token:
        raise HTTPException(status_code=401, detail="Invalid ops token")


@router.get("/health/sources")
def source_health(db: Session = Depends(get_db), _auth=Depends(_require_token)):
    """
    Per-source freshness & last run. Internal only.
    """
    settings = get_settings()
    sources = db.query(SourceRegistry).all()
    result = []
    now = datetime.now(UTC)
    for src in sources:
        last_snap: SourceSnapshot | None = (
            db.query(SourceSnapshot).filter(SourceSnapshot.source_id == src.id).order_by(desc(SourceSnapshot.fetched_at)).first()
        )
        last_obs: Observation | None = (
            db.query(Observation)
            .join(Station, Observation.station_id == Station.id)
            .filter(Station.source_id == src.id)
            .order_by(desc(Observation.observed_at))
            .first()
        )
        observed_at = last_obs.observed_at if last_obs else None
        fetched_at = last_snap.fetched_at if last_snap else None

        # Determine warning/critical thresholds per source type
        if src.name == "pdrrmo":
            # use scheduled hydrology defaults except tide
            # For overall source, use freshest observation's freshness
            warn = timedelta(minutes=settings.freshness_warning_minutes)
            crit = timedelta(minutes=settings.freshness_critical_minutes)
        else:
            warn = timedelta(minutes=src.freshness_warning_minutes or settings.freshness_warning_minutes)
            crit = timedelta(minutes=src.freshness_critical_minutes or settings.freshness_critical_minutes)

        freshness = compute_freshness(observed_at, fetched_at, warn, crit, now=now)
        # also compute per-kind freshness (tide, dam, rainfall) for distinct thresholds
        def _kind_freshness(kind: str, metric: str | None = None) -> str | None:
            q = db.query(Observation).join(Station, Observation.station_id == Station.id).filter(Station.source_id == src.id)
            if kind:
                q = q.filter(Station.kind == kind)
            if metric:
                q = q.filter(Observation.metric == metric)
            obs = q.order_by(desc(Observation.observed_at)).first()
            if not obs:
                return None
            # map kind to freshness kind param
            freshness_kind = kind
            if kind == "dam":
                freshness_kind = "dam"
            elif kind == "rainfall":
                freshness_kind = "dam"  # daily table shares 30h/54h
            return freshness_for_source(freshness_kind, obs.observed_at, last_snap.fetched_at if last_snap else None, now=now).value

        tide_freshness = _kind_freshness("tide")
        dam_freshness = _kind_freshness("dam")
        rainfall_freshness = _kind_freshness("rainfall")
        # river uses scheduled hydrology thresholds same as overall
        river_freshness = _kind_freshness("river")

        result.append(
            {
                "name": src.name,
                "canonical_url": src.canonical_url,
                "enabled": src.enabled,
                "cadence_minutes": src.cadence_minutes,
                "timezone": src.timezone,
                "parser_version": src.parser_version,
                "last_snapshot": {
                    "id": last_snap.id if last_snap else None,
                    "fetched_at": last_snap.fetched_at.isoformat() if last_snap and last_snap.fetched_at else None,
                    "http_status": last_snap.http_status if last_snap else None,
                    "content_hash": last_snap.content_hash if last_snap else None,
                    "content_length": last_snap.content_length if last_snap else None,
                    "compressed_length": last_snap.compressed_length if last_snap else None,
                    "error": last_snap.error if last_snap else None,
                }
                if last_snap
                else None,
                "last_observed_at": observed_at.isoformat() if observed_at else None,
                "fetched_at": fetched_at.isoformat() if fetched_at else None,
                "freshness": freshness.value,
                "tide_freshness": tide_freshness,
                "dam_freshness": dam_freshness,
                "rainfall_freshness": rainfall_freshness,
                "river_freshness": river_freshness,
                "freshness_thresholds": {"warning_after": str(warn), "critical_after": str(crit)},
            }
        )
    return {"sources": result, "computed_at": now.isoformat(), "disclaimer": "Internal freshness view — not a public forecast"}


@router.get("/snapshots")
def list_snapshots(
    source: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _auth=Depends(_require_token),
):
    q = db.query(SourceSnapshot)
    if source:
        src = db.query(SourceRegistry).filter(SourceRegistry.name == source).first()
        if not src:
            raise HTTPException(status_code=404, detail="source not found")
        q = q.filter(SourceSnapshot.source_id == src.id)
    snaps = q.order_by(desc(SourceSnapshot.fetched_at)).limit(limit).all()
    return {
        "snapshots": [
            {
                "id": s.id,
                "source_id": s.source_id,
                "fetched_at": s.fetched_at.isoformat(),
                "http_status": s.http_status,
                "content_hash": s.content_hash,
                "object_key": s.object_key,
                "content_length": s.content_length,
                "compressed_length": s.compressed_length,
                "compression": s.compression,
                "error": s.error,
                "parser_version": s.parser_version,
            }
            for s in snaps
        ]
    }


@router.get("/observations")
def list_observations(
    source: str | None = Query(default=None),
    metric: str | None = Query(default=None),
    station: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _auth=Depends(_require_token),
):
    q = db.query(Observation).join(Station, Observation.station_id == Station.id)
    if source:
        q = q.filter(Station.source_id == db.query(SourceRegistry.id).filter(SourceRegistry.name == source).scalar_subquery())
        # more direct: join SourceRegistry
        src = db.query(SourceRegistry).filter(SourceRegistry.name == source).first()
        if not src:
            raise HTTPException(status_code=404, detail="source not found")
        q = q.filter(Station.source_id == src.id)
    if metric:
        q = q.filter(Observation.metric == metric)
    if station:
        q = q.filter(Station.source_station_id == station)
    obs = q.order_by(desc(Observation.observed_at)).limit(limit).all()
    return {
        "observations": [
            {
                "id": o.id,
                "station_id": o.station_id,
                "metric": o.metric,
                "value": str(o.value) if o.value is not None else None,
                "unit": o.unit,
                "observed_at": o.observed_at.isoformat() if o.observed_at else None,
                "fetched_at": o.fetched_at.isoformat(),
                "quality_state": o.quality_state,
                "thresholds": o.thresholds_json,
                "raw_text": o.raw_text,
            }
            for o in obs
        ]
    }


@router.post("/collect")
def trigger_collect(source: str = Query(default="pdrrmo"), db: Session = Depends(get_db), _auth=Depends(_require_token)):
    if source != "pdrrmo":
        raise HTTPException(status_code=400, detail="Only pdrrmo source is available in Phase A")
    from app.collectors.pdrrmo import collect_pdrrmo

    result = collect_pdrrmo(db)
    return result
