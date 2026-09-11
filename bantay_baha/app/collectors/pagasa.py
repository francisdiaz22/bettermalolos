"""PAGASA Flood Information collector, deliberately gated by source acceptance."""
from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.collectors.base import fetch_with_retries
from app.collectors.pdrrmo import _is_source_approved, _upsert_observation, get_or_create_station, persist_snapshot
from app.config import get_settings
from app.logging_config import get_logger
from app.models import AuditLog, ObservationQuality, OfficialAdvisory, SourceRegistry, SourceSnapshot
from app.parsers.pagasa import PAGASA_PARSER_VERSION, ParsedResult, parse_pagasa_snapshot

logger = get_logger(__name__)
COLLECTOR_NAME = "pagasa_flood"
PAGASA_LICENSING_FINDING = (
    "Restricted/unclear — PAGASA HMD hydrometeorological-data terms require an acknowledged purpose, "
    "attribution, and prohibit redistribution of requested data. Applicability to the public flood page is "
    "unclear. Written PAGASA clearance is required before live automation or redistribution."
)
PAGASA_ROBOTS_FINDING = (
    "No robots.txt policy published at the canonical host (HTTP 404 checked 2026-09-04); this is not "
    "permission. Obey written PAGASA terms/clearance and the conservative application cadence."
)
PAGASA_EXPECTED_UPDATE_FREQUENCY = (
    "Proposed, not approved: conditional fetch 30m; dam warning 30h/unavailable 54h; "
    "untimestamped status internal and unscored."
)


def ensure_source(db: Session) -> SourceRegistry:
    settings = get_settings()
    source = db.query(SourceRegistry).filter(SourceRegistry.name == COLLECTOR_NAME).first()
    if source:
        return source
    source = SourceRegistry(
        name=COLLECTOR_NAME,
        canonical_url=settings.pagasa_flood_url,
        type="hydrology_advisory",
        enabled=False,
        cadence_minutes=settings.pagasa_cadence_minutes,
        timezone="Asia/Manila",
        publisher="DOST-PAGASA",
        owner="Bantay Baha ops",
        freshness_warning_minutes=settings.freshness_warning_minutes,
        freshness_critical_minutes=settings.freshness_critical_minutes,
        parser_version=PAGASA_PARSER_VERSION,
        terms_url="https://www.pagasa.dost.gov.ph/flood",
        licensing_terms=PAGASA_LICENSING_FINDING,
        robots_txt=PAGASA_ROBOTS_FINDING,
        expected_update_frequency=PAGASA_EXPECTED_UPDATE_FREQUENCY,
        maintainer_name="Bantay Baha ops",
        maintainer_contact="ops@bettermalolos.org",
        second_reviewer="pending",
        notes=(
            "PAGASA Flood Information page. Fixture-only collection is permitted for internal parser work. "
            "Before live enablement: record terms/robots review, canonical artifacts, timestamp semantics, cadence, owner/contact, "
            "and a named independent field-mapping reviewer. Basin status has no inferred issue/expiry time."
        ),
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source


def _store_parsed_result(
    db: Session, source: SourceRegistry, snapshot: SourceSnapshot, parsed: ParsedResult, fetched_at: datetime
) -> dict[str, int]:
    counts = {"basin": 0, "dam": 0, "advisory": 0, "errors": 0}
    try:
        for basin in parsed.basins:
            station = get_or_create_station(db, source, f"basin:{basin.area.lower().replace(' ', '-')}", basin.area, "basin", None)
            _upsert_observation(
                db,
                station,
                snapshot,
                source,
                metric="basin_flood_status",
                value=None,
                unit=None,
                observed_at=None,
                fetched_at=fetched_at,
                raw_text=basin.status,
                quality=ObservationQuality.parse_error.value,
            )
            # A source page does not publish a timestamp for these links. Keep
            # this as an internal advisory record; it is not a scored condition.
            counts["basin"] += 1
        for dam in parsed.dams:
            station = get_or_create_station(db, source, f"dam:{dam.name.lower().replace(' ', '-')}", dam.name, "dam", "m")
            quality = ObservationQuality.valid.value if dam.observed_at and dam.reservoir_level_m is not None else ObservationQuality.parse_error.value
            _upsert_observation(
                db,
                station,
                snapshot,
                source,
                metric="dam_level",
                value=dam.reservoir_level_m,
                unit="m",
                observed_at=dam.observed_at,
                fetched_at=fetched_at,
                source_published_at=dam.observed_at,
                thresholds={"nhwl_m": str(dam.nhwl_m) if dam.nhwl_m is not None else None},
                raw_text=dam.raw_text,
                quality=quality,
            )
            counts["dam"] += 1
        for advisory in parsed.advisories:
            db.add(
                OfficialAdvisory(
                    source_id=source.id,
                    snapshot_id=snapshot.id,
                    source_url=advisory.source_url,
                    raw_text=advisory.raw_text,
                    level=advisory.level,
                    areas_json=json.dumps([advisory.area]),
                    structured_json=json.dumps({"area": advisory.area, "status": advisory.level}),
                    extraction_confidence="low",
                )
            )
            counts["advisory"] += 1
        if parsed.errors:
            counts["errors"] = len(parsed.errors)
            snapshot.error = "; ".join(issue.message for issue in parsed.errors)
            db.add(snapshot)
            db.add(
                AuditLog(
                    actor="system",
                    action="parse_warning",
                    entity_type="source_snapshot",
                    entity_id=snapshot.id,
                    after=json.dumps({"errors": [issue.message for issue in parsed.errors]}),
                )
            )
        db.commit()
    except Exception:
        db.rollback()
        raise
    return counts


def collect_pagasa(db: Session, content_override: bytes | None = None) -> dict:
    source = ensure_source(db)
    fetched_at = datetime.now(UTC)
    content: bytes
    status_code: int
    content_type: str | None
    headers: dict[str, str]
    if content_override is None and not _is_source_approved(source):
        return {"snapshot_id": None, "status_code": 503, "error": "source not approved/enabled - synthetic only", "counts": {}}
    if content_override is not None:
        content, status_code, content_type, headers = content_override, 200, "text/html", {}
    else:
        latest = db.query(SourceSnapshot).filter(SourceSnapshot.source_id == source.id).order_by(SourceSnapshot.fetched_at.desc()).first()
        if latest and fetched_at - latest.fetched_at.replace(tzinfo=latest.fetched_at.tzinfo or UTC) < timedelta(minutes=source.cadence_minutes):
            return {"snapshot_id": latest.id, "status_code": 304, "counts": {}, "warnings": ["rate limited"]}
        headers = {}
        if source.last_etag:
            headers["If-None-Match"] = source.last_etag
        if source.last_modified:
            headers["If-Modified-Since"] = source.last_modified
        try:
            response = fetch_with_retries(source.canonical_url, headers=headers or None)
        except Exception as exc:
            snapshot = persist_snapshot(db, source, str(exc).encode(), 599, "text/plain", {}, fetched_at, PAGASA_PARSER_VERSION)
            snapshot.error = str(exc)
            db.add(AuditLog(actor="system", action="collect_failed", entity_type="source_snapshot", entity_id=snapshot.id, after=json.dumps({"error": str(exc)})))
            db.commit()
            return {"snapshot_id": snapshot.id, "status_code": 599, "error": str(exc), "counts": {}}
        content, status_code, content_type, fetched_at = response.content, response.status_code, response.content_type, response.fetched_at
        headers = response.headers
        source.last_etag = headers.get("etag") or source.last_etag
        source.last_modified = headers.get("last-modified") or source.last_modified
        db.commit()
        if status_code == 304:
            return {"snapshot_id": latest.id if latest else None, "status_code": 304, "counts": {}, "warnings": ["not modified"]}
    snapshot = persist_snapshot(db, source, content, status_code, content_type, headers, fetched_at, PAGASA_PARSER_VERSION)
    if status_code != 200:
        return {"snapshot_id": snapshot.id, "status_code": status_code, "error": f"HTTP {status_code}", "counts": {}}
    parsed = parse_pagasa_snapshot(content, source.canonical_url)
    # Both data tables are required. A malformed page never produces a partial
    # current state, although its snapshot remains auditable.
    if parsed.errors:
        snapshot.error = "; ".join(issue.message for issue in parsed.errors)
        db.add(snapshot)
        db.add(AuditLog(actor="system", action="collect_failed", entity_type="source_snapshot", entity_id=snapshot.id, after=json.dumps({"errors": [i.message for i in parsed.errors]})))
        db.commit()
        return {"snapshot_id": snapshot.id, "status_code": 200, "counts": {}, "errors": [i.message for i in parsed.errors]}
    counts = _store_parsed_result(db, source, snapshot, parsed, fetched_at)
    db.add(AuditLog(actor="system", action="collect_success", entity_type="source_snapshot", entity_id=snapshot.id, after=json.dumps({"counts": counts})))
    db.commit()
    return {"snapshot_id": snapshot.id, "status_code": 200, "counts": counts, "warnings": [i.message for i in parsed.warnings]}
