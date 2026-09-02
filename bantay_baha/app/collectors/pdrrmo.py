from __future__ import annotations

import json
from datetime import UTC, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.collectors.base import fetch_with_retries
from app.config import get_settings
from app.logging_config import get_logger
from app.models import AuditLog, Observation, SourceRegistry, SourceSnapshot, Station
from app.models.base import uuid_pk
from app.models.enums import ObservationQuality
from app.models.observation import observation_active_key
from app.parsers.pdrrmo import PDRRMO_PARSER_VERSION, ParsedResult, parse_pdrrmo_snapshot
from app.services.snapshot_store import (
    compress_snapshot,
    compute_hash,
    enforce_database_quota,
    store_raw_snapshot,
)

logger = get_logger(__name__)
COLLECTOR_NAME = "pdrrmo"


def _is_source_approved(source: SourceRegistry) -> bool:
    """Approval gate per source acceptance checklist.

    Requires: enabled flag, a real approved_at timestamp, a named second
    reviewer (not pending/empty), and a completed terms/permission review
    (terms_reviewed_at set and licensing_terms not indicating pending
    permission). Synthetic timestamps from seed data must not satisfy this.
    """
    if not source.enabled:
        return False
    if source.terms_reviewed_at is None:
        return False
    if source.approved_at is None:
        return False
    reviewer = (source.second_reviewer or "").strip().lower()
    if reviewer in ("", "pending", "pending_review"):
        return False
    licensing = (source.licensing_terms or "").strip().lower()
    robots = (source.robots_txt or "").strip().lower()
    blocked_markers = ("pending", "not approved", "not yet confirmed", "to be confirmed", "unclear")
    if any(marker in licensing for marker in blocked_markers):
        return False
    if not licensing or any(marker in robots for marker in blocked_markers):
        return False
    return True


def ensure_source(db: Session) -> SourceRegistry:
    src = db.query(SourceRegistry).filter(SourceRegistry.name == COLLECTOR_NAME).first()
    if src:
        return src
    settings = get_settings()
    import json as _json

    # default acceptance record — keep disabled and UNAPPROVED until
    # permission/terms are confirmed and a named second reviewer approves.
    # Do NOT manufacture approval timestamps in seed/ensure data.
    _range = _json.dumps(
        {
            "rainfall_mm": {"min": 0, "max": 500, "unit": "mm", "action": "flag out_of_range"},
            "dam_level_m": {"min": 0, "max": 250, "unit": "m", "action": "flag out_of_range"},
            "river_level_m": {"min": -5, "max": 20, "unit": "m", "action": "flag out_of_range"},
            "tide_height_m": {"min": 0, "max": 10, "unit": "m", "action": "flag out_of_range"},
        }
    )
    src = SourceRegistry(
        name=COLLECTOR_NAME,
        canonical_url=settings.pdrrmo_url,
        type="hydrology",
        enabled=False,
        cadence_minutes=settings.pdrrmo_cadence_minutes,
        timezone="Asia/Manila",
        publisher="Bulacan PDRRMO",
        owner="Bantay Baha ops",
        freshness_warning_minutes=settings.freshness_warning_minutes,
        freshness_critical_minutes=settings.freshness_critical_minutes,
        parser_version=PDRRMO_PARSER_VERSION,
        terms_reviewed_at=None,
        terms_url="https://pdrrmo.bulacan.gov.ph/",
        licensing_terms="Pending — permission/terms not yet confirmed; automated retrieval NOT approved. Complete source acceptance checklist before enabling.",
        robots_txt="Pending verification — do not enable scheduler until robots/terms are manually verified and recorded.",
        expected_update_frequency="Multiple daily in wet season; daily health check in dry season",
        maintainer_name="Bantay Baha ops",
        maintainer_contact="ops@bettermalolos.org",
        second_reviewer="pending",
        approved_at=None,
        range_policy_json=_range,
        notes="Tide, dam, rainfall (Barangay Look 1st etc.), flooding status, river stations from pdrrmo.bulacan.gov.ph — awaiting approval (approved_at/second_reviewer required).",
    )
    db.add(src)
    db.commit()
    db.refresh(src)
    return src


def get_or_create_station(db: Session, source: SourceRegistry, source_station_id: str, name: str, kind: str, unit: str | None) -> Station:
    station = (
        db.query(Station)
        .filter(Station.source_id == source.id, Station.source_station_id == source_station_id)
        .first()
    )
    if station:
        # update kind/unit if changed
        dirty = False
        if station.kind != kind:
            station.kind = kind
            dirty = True
        if unit and station.unit != unit:
            station.unit = unit
            dirty = True
        if dirty:
            db.add(station)
            db.flush()
            db.refresh(station)
        return station
    station = Station(
        source_id=source.id,
        source_station_id=source_station_id,
        name=name,
        kind=kind,
        unit=unit,
    )
    db.add(station)
    db.flush()
    db.refresh(station)
    return station


def persist_snapshot(db: Session, source: SourceRegistry, content: bytes, status_code: int, content_type: str | None, headers: dict, fetched_at: datetime) -> SourceSnapshot:
    chash = compute_hash(content)
    # deduplicate exact content hashes only when audit links remain intact — we still create snapshot record but skip duplicate parsing?
    # For Phase A, we store every fetch as a snapshot, but we note if hash already exists.
    existing = db.query(SourceSnapshot).filter(SourceSnapshot.source_id == source.id, SourceSnapshot.content_hash == chash).first()
    settings = get_settings()
    snapshot_id = uuid_pk()
    compressed: bytes | None = None
    if settings.storage_backend == "database":
        compressed = compress_snapshot(content)
        enforce_database_quota(db, len(compressed))
        object_key = f"database://source_snapshot/{snapshot_id}"
    else:
        object_key, _ = store_raw_snapshot(source.name, content, content_type)
    snap = SourceSnapshot(
        id=snapshot_id,
        source_id=source.id,
        fetched_at=fetched_at,
        http_status=status_code,
        content_hash=chash,
        object_key=object_key,
        content_type=content_type,
        parser_version=PDRRMO_PARSER_VERSION,
        content_length=len(content),
        compressed_length=len(compressed) if compressed is not None else None,
        compression="gzip" if compressed is not None else None,
        raw_body_gzip=compressed,
        error=None if status_code == 200 else f"HTTP {status_code}",
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    if existing:
        logger.info("duplicate content hash — stored new snapshot but noted duplication", source=source.name, hash=chash)
    return snap


def _upsert_observation(
    db: Session,
    station: Station,
    snapshot: SourceSnapshot,
    source: SourceRegistry,
    metric: str,
    value: Decimal | None,
    unit: str | None,
    observed_at: datetime | None,
    fetched_at: datetime,
    thresholds: dict | None = None,
    raw_text: str | None = None,
    quality: str = ObservationQuality.valid.value,
) -> Observation | None:
    # Plausibility: reject negative rainfall and impossible negative dam levels
    if metric == "rainfall" and value is not None and value < 0:
        quality = ObservationQuality.out_of_range.value
        logger.warning("out_of_range rainfall negative", station=station.name, value=str(value))
        # still store but flagged
    if metric == "dam_level" and value is not None and value < 0:
        quality = ObservationQuality.out_of_range.value
        logger.warning("out_of_range dam negative", station=station.name, value=str(value))

    # If observed_at is missing/unparseable, do not deduplicate — each such row is a distinct parse_error/missing event
    # This prevents NULL grouping bugs and ensures audit trail.
    if observed_at is None:
        obs = Observation(
            station_id=station.id,
            snapshot_id=snapshot.id,
            metric=metric,
            value=value,
            unit=unit,
            observed_at=None,
            fetched_at=fetched_at,
            source_url=source.canonical_url,
            parser_version=PDRRMO_PARSER_VERSION,
            quality_state=quality if quality != ObservationQuality.valid.value else ObservationQuality.parse_error.value,
            thresholds_json=json.dumps(thresholds) if thresholds else None,
            raw_text=raw_text,
            active_key=None,
        )
        db.add(obs)
        db.flush()
        db.refresh(obs)
        return obs

    # idempotency: check exact duplicate on station, metric, observed time, source
    # If duplicate with same value exists, skip
    existing = (
        db.query(Observation)
        .filter(
            Observation.station_id == station.id,
            Observation.metric == metric,
            Observation.observed_at == observed_at,
            Observation.value == value,
            Observation.quality_state != ObservationQuality.superseded.value,
        )
        .first()
    )
    serialized_thresholds = json.dumps(thresholds) if thresholds else None
    if existing and existing.value == value:
        # If thresholds changed, treat as superseding
        if thresholds and existing.thresholds_json != serialized_thresholds:
            # supersede — fall through to prev handling
            pass
        else:
            logger.info("duplicate observation skipped", station=station.name, metric=metric, observed_at=str(observed_at))
            return existing

    # If a previous observation exists for same station/metric/observed_at with different value → supersede
    prev = (
        db.query(Observation)
        .filter(
            Observation.station_id == station.id,
            Observation.metric == metric,
            Observation.observed_at == observed_at,
            Observation.quality_state != ObservationQuality.superseded.value,
        )
        .first()
    )
    supersedes_id: str | None = None
    if prev and (prev.value != value or prev.thresholds_json != serialized_thresholds):
        prev.quality_state = ObservationQuality.superseded.value
        prev.active_key = None
        db.add(prev)
        db.flush()  # ensure prev.id available
        supersedes_id = prev.id
        logger.info("superseding previous observation", station=station.name, metric=metric, old=str(prev.value), new=str(value))

    obs = Observation(
        station_id=station.id,
        snapshot_id=snapshot.id,
        metric=metric,
        value=value,
        unit=unit,
        observed_at=observed_at,
        fetched_at=fetched_at,
        source_url=source.canonical_url,
        parser_version=PDRRMO_PARSER_VERSION,
        quality_state=quality,
        thresholds_json=serialized_thresholds,
        raw_text=raw_text,
        supersedes_id=supersedes_id,
        active_key=observation_active_key(station.id, metric, observed_at),
    )
    db.add(obs)
    db.flush()
    db.refresh(obs)
    return obs


def store_parsed_result(db: Session, source: SourceRegistry, snapshot: SourceSnapshot, parsed: ParsedResult, fetched_at: datetime) -> dict:
    counts: dict[str, int] = {"tide": 0, "dam": 0, "rainfall": 0, "flooding": 0, "river": 0, "errors": 0}

    # Use a single transaction/savepoint for all observation writes.
    # If any write fails, the entire snapshot's observations are rolled back
    # and only the failure audit record is written in a fresh transaction by the caller.
    # We flush per observation but commit once at the end.
    try:
        # Tides → station per tide height? We model tide as station "Manila Bay tide (PDRRMO)" with tide_height metric; each row is an observation
        # But spec says tide schedule entries: store each as observation with observed_at = tide time
        tide_station = get_or_create_station(db, source, "tide-schedule-manila-bay", "Tide Schedule", "tide", unit="m")
        for t in parsed.tides:
            quality = ObservationQuality.valid.value
            if t.height_m is None or t.height_ft is None or t.observed_at is None:
                quality = ObservationQuality.parse_error.value
            elif t.height_m < 0 or t.height_m > 10:
                quality = ObservationQuality.out_of_range.value
            _upsert_observation(
                db, tide_station, snapshot, source,
                metric="tide_height",
                value=t.height_m,
                unit="m",
                observed_at=t.observed_at,
                fetched_at=fetched_at,
                thresholds={"height_ft": str(t.height_ft) if t.height_ft is not None else None, "label": t.label},
                raw_text=f"{t.label} {t.date_str} {t.time_str} {t.height_m} m / {t.height_ft} ft" if t.observed_at is not None else f"{t.label} {t.date_str} {t.time_str} {t.height_m} m / {t.height_ft} ft [unparseable date]",
                quality=quality,
            )
            counts["tide"] += 1

        for d in parsed.dams:
            station = get_or_create_station(db, source, f"dam:{d.dam.lower().replace(' ', '-')}", d.dam, "dam", unit="m")
            quality = ObservationQuality.valid.value
            if d.observed_at is None:
                quality = ObservationQuality.parse_error.value
            elif d.current_level is None:
                quality = ObservationQuality.missing.value
            elif d.current_level < 0:
                quality = ObservationQuality.out_of_range.value
            _upsert_observation(
                db, station, snapshot, source,
                metric="dam_level",
                value=d.current_level,
                unit="m",
                observed_at=d.observed_at,
                fetched_at=fetched_at,
                thresholds={"normal": str(d.normal_level) if d.normal_level else None, "spilling": str(d.spilling_level) if d.spilling_level else None},
                raw_text=f"{d.dam} {d.current_level} m on {d.date_str}",
                quality=quality,
            )
            counts["dam"] += 1

        for r in parsed.rainfall:
            station = get_or_create_station(db, source, f"rainfall:{r.station.lower().replace(' ', '-').replace(',', '')}", r.station, "rainfall", unit="mm")
            quality = ObservationQuality.valid.value
            if r.observed_at is None:
                quality = ObservationQuality.parse_error.value
            elif r.rainfall_mm is None:
                quality = ObservationQuality.missing.value
            elif r.rainfall_mm < 0:
                quality = ObservationQuality.out_of_range.value
            _upsert_observation(
                db, station, snapshot, source,
                metric="rainfall",
                value=r.rainfall_mm,
                unit="mm",
                observed_at=r.observed_at,
                fetched_at=fetched_at,
                raw_text=f"{r.station} {r.rainfall_mm} mm on {r.date_str}",
                quality=quality,
            )
            counts["rainfall"] += 1

        for f in parsed.flooding:
            station = get_or_create_station(db, source, f"flooding:{f.municipality.lower().replace(' ', '-')}", f.municipality, "flooding", unit=None)
            quality = ObservationQuality.valid.value
            if f.observed_at is None:
                quality = ObservationQuality.parse_error.value
            _upsert_observation(
                db, station, snapshot, source,
                metric="flood_level",
                value=None,
                unit=None,
                observed_at=f.observed_at,
                fetched_at=fetched_at,
                raw_text=f.flood_level,
                quality=quality,
            )
            counts["flooding"] += 1

        for rv in parsed.rivers:
            station = get_or_create_station(db, source, f"river:{rv.station.lower().replace(' ', '-').replace(',', '')}", rv.station, "river", unit="m")
            quality = ObservationQuality.valid.value
            if rv.observed_at is None:
                quality = ObservationQuality.parse_error.value
            elif rv.actual_level is None:
                quality = ObservationQuality.missing.value
            count_thresholds = {"alert": str(rv.alert_level), "alarm": str(rv.alarm_level), "critical": str(rv.critical_level)}
            _upsert_observation(
                db, station, snapshot, source,
                metric="river_level",
                value=rv.actual_level,
                unit="m",
                observed_at=rv.observed_at,
                fetched_at=fetched_at,
                thresholds=count_thresholds,
                raw_text=f"{rv.station} {rv.actual_level} m (alert {rv.alert_level} alarm {rv.alarm_level} critical {rv.critical_level}) on {rv.date_str}",
                quality=quality,
            )
            counts["river"] += 1

        # If parser had errors, mark snapshot error and audit — still part of same transaction
        if parsed.errors:
            for e in parsed.errors:
                logger.error("parser error", table=e.table, message=e.message)
            counts["errors"] = len(parsed.errors)
            snapshot.error = "; ".join([e.message for e in parsed.errors])
            db.add(snapshot)
            db.flush()
            db.add(AuditLog(actor="system", action="parse_error", entity_type="source_snapshot", entity_id=snapshot.id, after=json.dumps({"errors": [e.message for e in parsed.errors]})))
            db.flush()

        # warnings as log
        if parsed.warnings:
            for w in parsed.warnings:
                logger.warning("parser warning", table=w.table, message=w.message)

        db.commit()
    except Exception:
        db.rollback()
        raise

    return counts


REQUIRED_TABLES = {"tide", "dam", "rainfall", "river"}  # flooding is optional (empty is valid)


def collect_pdrrmo(db: Session, content_override: bytes | None = None) -> dict:
    """One-command collector: fetch → snapshot (before parse) → parse → store observations.

    If content_override is provided, skip HTTP fetch (for tests/fixtures) and bypass enabled gate (synthetic evaluation).
    Returns dict with snapshot_id, counts, warnings, errors.
    """
    source = ensure_source(db)
    settings = get_settings()
    fetched_at = datetime.now(UTC)

    # Production gate: live fetch only when source has passed full approval
    if content_override is None and not _is_source_approved(source):
        logger.warning(
            "collect blocked — source not approved/enabled",
            source=source.name,
            enabled=source.enabled,
            terms_reviewed=str(source.terms_reviewed_at),
            approved_at=str(source.approved_at),
            second_reviewer=str(source.second_reviewer),
        )
        return {"snapshot_id": None, "status_code": 503, "error": "source not approved/enabled - synthetic only", "counts": {}}

    if content_override is not None:
        content = content_override
        status_code = 200
        content_type: str | None = "text/html"
        headers: dict[str, str] = {}
    else:
        # rate limit: respect cadence_minutes
        last_snap = db.query(SourceSnapshot).filter(SourceSnapshot.source_id == source.id).order_by(SourceSnapshot.fetched_at.desc()).first()
        if last_snap:
            from datetime import timedelta as _td

            snap_time = last_snap.fetched_at
            if snap_time.tzinfo is None:
                snap_time = snap_time.replace(tzinfo=UTC)
            elapsed = fetched_at - snap_time
            cadence = _td(minutes=source.cadence_minutes or settings.pdrrmo_cadence_minutes)
            if elapsed < cadence:
                logger.info("rate limited — skipping fetch", source=source.name, elapsed=str(elapsed), cadence=str(cadence))
                return {"snapshot_id": last_snap.id, "status_code": 304, "error": "rate limited", "counts": {}, "warnings": [f"rate limited {elapsed} < {cadence}"]}

        # conditional request headers from last snapshot etag/last-modified
        cond_headers: dict = {}
        if source.last_etag:
            cond_headers["If-None-Match"] = source.last_etag
        if source.last_modified:
            cond_headers["If-Modified-Since"] = source.last_modified

        try:
            result = fetch_with_retries(settings.pdrrmo_url, headers=cond_headers if cond_headers else None)
        except Exception as e:
            # persist error snapshot so failure is auditable, but do not delete last good
            logger.error("fetch exception", error=str(e), url=settings.pdrrmo_url)
            # create a snapshot placeholder for the failure
            err_content = f"fetch exception: {e}".encode()
            snapshot = persist_snapshot(db, source, err_content, 599, "text/plain", {}, fetched_at)
            snapshot.error = str(e)
            db.add(snapshot)
            db.add(AuditLog(actor="system", action="collect_failed", entity_type="source_snapshot", entity_id=snapshot.id, after=json.dumps({"error": str(e)})))
            db.commit()
            return {"snapshot_id": snapshot.id, "status_code": 599, "error": str(e), "counts": {}, "errors": [str(e)]}

        content = result.content
        status_code = result.status_code
        content_type = result.content_type
        headers = result.headers
        fetched_at = result.fetched_at
        # store etag/last-modified for next conditional request
        if result.headers.get("etag"):
            source.last_etag = result.headers.get("etag")
        if result.headers.get("last-modified"):
            source.last_modified = result.headers.get("last-modified")
        db.add(source)
        db.commit()

        # 304 Not Modified — content not changed
        if status_code == 304:
            logger.info("304 not modified — no parse needed", source=source.name)
            return {"snapshot_id": last_snap.id if last_snap else None, "status_code": 304, "counts": {}, "warnings": ["not modified"]}

    # Persist raw body BEFORE parsing (collector contract)
    snapshot = persist_snapshot(db, source, content, status_code, content_type or "text/html", headers, fetched_at)

    if status_code != 200:
        logger.error("fetch failed", status=status_code, url=settings.pdrrmo_url)
        # never delete last known good value — just record failure
        return {"snapshot_id": snapshot.id, "status_code": status_code, "error": f"HTTP {status_code}", "counts": {}}

    parsed = parse_pdrrmo_snapshot(content, fetched_at=fetched_at)

    # Atomic failure: if any REQUIRED table has an error, treat whole snapshot as failed
    required_errors = [e for e in parsed.errors if e.table in REQUIRED_TABLES]
    has_required_failure = len(required_errors) > 0
    # Legacy fallback: no observations at all
    wholly_failed = parsed.errors and not (parsed.tides or parsed.dams or parsed.rainfall or parsed.rivers)
    if has_required_failure or wholly_failed:
        logger.error("parse failed closed - no observations stored (atomic)", errors=[e.message for e in parsed.errors], required_errors=[e.message for e in required_errors])
        snapshot.error = "; ".join([e.message for e in parsed.errors])
        db.add(snapshot)
        db.add(AuditLog(actor="system", action="collect_failed", entity_type="source_snapshot", entity_id=snapshot.id, after=json.dumps({"errors": [e.message for e in parsed.errors], "required_errors": [e.message for e in required_errors]})))
        db.commit()
        return {"snapshot_id": snapshot.id, "status_code": status_code, "counts": {}, "errors": [e.message for e in parsed.errors], "warnings": [w.message for w in parsed.warnings]}

    # Parse succeeded — store atomically; store_parsed_result uses separate commits per observation but we treat snapshot-level
    # If store fails, snapshot remains auditable
    try:
        counts = store_parsed_result(db, source, snapshot, parsed, fetched_at)
    except Exception as e:
        logger.error("store failed — rolling back observations", error=str(e))
        snapshot.error = f"store error: {e}"
        db.add(snapshot)
        db.add(AuditLog(actor="system", action="collect_failed", entity_type="source_snapshot", entity_id=snapshot.id, after=json.dumps({"error": str(e)})))
        db.commit()
        return {"snapshot_id": snapshot.id, "status_code": status_code, "counts": {}, "errors": [str(e)]}

    # audit success
    db.add(AuditLog(actor="system", action="collect_success", entity_type="source_snapshot", entity_id=snapshot.id, after=json.dumps({"counts": counts})))
    db.commit()

    logger.info("collect complete", source=source.name, snapshot_id=snapshot.id, counts=counts)
    return {"snapshot_id": snapshot.id, "status_code": status_code, "counts": counts, "errors": [e.message for e in parsed.errors], "warnings": [w.message for w in parsed.warnings]}
