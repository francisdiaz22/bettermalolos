"""Phase A audit gaps — supplemental coverage for G3/G5/G6/G8/G9/G10."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.collectors.pdrrmo import collect_pdrrmo
from app.database import Base, engine, session_local
from app.main import app
from app.models import Observation, SourceSnapshot
from app.parsers.pdrrmo import parse_pdrrmo_snapshot
from app.services.freshness import compute_freshness, freshness_for_source

FIXTURE = Path(__file__).parents[1] / "fixtures/pdrrmo/sample_2026-09-02.html"
FLOODING_FIXTURE = Path(__file__).parents[1] / "fixtures/pdrrmo/sample_flooding_populated.html"


def setup_module():
    Base.metadata.drop_all(bind=engine())
    Base.metadata.create_all(bind=engine())


def _db() -> Session:
    return session_local()()


def test_live_collection_requires_completed_source_approval():
    """Live fetch stays blocked until every approval field is complete and non-pending."""
    from app.collectors.pdrrmo import _is_source_approved, ensure_source

    db = _db()
    try:
        source = ensure_source(db)
        source.enabled = True
        source.terms_reviewed_at = datetime(2026, 9, 2, 6, 0, tzinfo=UTC)
        source.approved_at = datetime(2026, 9, 2, 7, 0, tzinfo=UTC)
        source.second_reviewer = "Maria Santos"
        source.licensing_terms = "Pending — automated retrieval not approved"
        source.robots_txt = "Allow: /"
        assert _is_source_approved(source) is False

        source.licensing_terms = "Automated retrieval approved with attribution"
        source.robots_txt = "Pending verification"
        assert _is_source_approved(source) is False

        source.robots_txt = "Verified 2026-09-02: Allow: /"
        assert _is_source_approved(source) is True

        source.second_reviewer = "pending"
        assert _is_source_approved(source) is False
    finally:
        db.rollback()
        db.close()


def test_atomic_failure_on_missing_required_table():
    """G3: one missing required table → no observations stored (atomic)."""
    db = _db()
    try:
        before = db.query(Observation).count()
        html = FIXTURE.read_text(encoding="utf-8")
        # Remove Status of Dams table (required)
        html_broken = html.replace("Status of Dams", "Removed Dams Section", 1)
        result = collect_pdrrmo(db, content_override=html_broken.encode("utf-8"))
        # Should fail closed with required error
        assert result["counts"] == {}
        assert result["errors"]
        assert any("dam" in e.lower() for e in result["errors"])
        after = db.query(Observation).count()
        assert after == before, "partial observations leaked on required table failure"
    finally:
        db.close()


def test_supersedes_id_populated_on_correction():
    """G5: corrected record marks old row superseded and sets supersedes_id."""
    db = _db()
    try:
        content = FIXTURE.read_bytes()
        collect_pdrrmo(db, content_override=content)
        html = content.decode("utf-8")
        html_corrected = html.replace("0.0 mm", "2.5 mm", 1)
        result = collect_pdrrmo(db, content_override=html_corrected.encode("utf-8"))
        assert result["counts"]["rainfall"] == 2
        superseded = db.query(Observation).filter(Observation.quality_state == "superseded").all()
        assert len(superseded) >= 1
        new_obs = db.query(Observation).filter(Observation.supersedes_id.isnot(None)).all()
        assert len(new_obs) >= 1
        assert any(o.supersedes_id == s.id for o in new_obs for s in superseded)
    finally:
        db.close()


def test_null_observed_at_not_deduped():
    """G5: observations with missing observed_at are not deduplicated."""
    db = _db()
    try:
        FIXTURE.read_text(encoding="utf-8")
        # Corrupt a dam date to make observed_at fallback to now() but still uniq? Instead directly test _upsert
        from datetime import UTC as _UTC

        from app.collectors.pdrrmo import _upsert_observation, ensure_source, persist_snapshot

        source = ensure_source(db)
        snap = persist_snapshot(db, source, b"test-null-observed", 200, "text/html", {}, datetime.now(_UTC))
        station = db.query(Observation).first()
        # If no station yet, create via collect then use
        if not station:
            collect_pdrrmo(db, content_override=FIXTURE.read_bytes())
            station = db.query(Observation).first()
        from app.models import Station

        st = db.query(Station).first()
        obs1 = _upsert_observation(db, st, snap, source, metric="rainfall", value=None, unit="mm", observed_at=None, fetched_at=datetime.now(_UTC))
        obs2 = _upsert_observation(db, st, snap, source, metric="rainfall", value=None, unit="mm", observed_at=None, fetched_at=datetime.now(_UTC))
        assert obs1.id != obs2.id, "null observed_at rows must not be deduplicated"
        assert obs1.quality_state == "parse_error"
    finally:
        db.close()


def test_populated_flooding_fixture_produces_two_rows():
    """G10: populated flooding fixture has 2 municipalities."""
    db = _db()
    try:
        content = FLOODING_FIXTURE.read_bytes()
        result = collect_pdrrmo(db, content_override=content)
        assert result["counts"]["flooding"] == 2
        flood_obs = db.query(Observation).filter(Observation.metric == "flood_level").all()
        assert len([o for o in flood_obs if "Knee" in (o.raw_text or "") or "Waist" in (o.raw_text or "")]) >= 2
    finally:
        db.close()


def test_freshness_distinguishes_hydrology_daily_tide():
    """G10: internal freshness distinguishes scheduled hydrology, daily, tide."""
    now = datetime(2026, 9, 2, 12, 0, tzinfo=UTC)
    # Scheduled hydrology: 45m warn / 90m critical
    assert compute_freshness(now - timedelta(minutes=10), now - timedelta(minutes=10), timedelta(minutes=45), timedelta(minutes=90), now=now).value == "fresh"
    assert compute_freshness(now - timedelta(minutes=50), now - timedelta(minutes=50), timedelta(minutes=45), timedelta(minutes=90), now=now).value == "stale_warning"
    assert compute_freshness(now - timedelta(minutes=100), now - timedelta(minutes=50), timedelta(minutes=45), timedelta(minutes=90), now=now).value == "stale_critical"
    # Daily dam/rainfall: 30h / 54h
    assert freshness_for_source("dam", now - timedelta(hours=10), now - timedelta(hours=10), now=now).value == "fresh"
    assert freshness_for_source("dam", now - timedelta(hours=31), now - timedelta(hours=31), now=now).value == "stale_warning"
    assert freshness_for_source("dam", now - timedelta(hours=55), now - timedelta(hours=55), now=now).value == "stale_critical"
    # Tide: 36h / 72h
    assert freshness_for_source("tide", now - timedelta(hours=30), now - timedelta(hours=30), now=now).value == "fresh"
    assert freshness_for_source("tide", now - timedelta(hours=37), now - timedelta(hours=37), now=now).value == "stale_warning"
    assert freshness_for_source("tide", now - timedelta(hours=73), now - timedelta(hours=73), now=now).value == "stale_critical"


def test_freshness_endpoint_returns_distinct_tide():
    client = TestClient(app)
    db = _db()
    try:
        collect_pdrrmo(db, content_override=FIXTURE.read_bytes())
        r = client.get("/v1/ops/health/sources")
        assert r.status_code == 200
        body = r.json()
        assert "sources" in body
        src = next(s for s in body["sources"] if s["name"] == "pdrrmo")
        assert "freshness" in src
        # tide, dam, rainfall have distinct thresholds (36h/72h vs 30h/54h vs 45m/90m)
        assert "tide_freshness" in src
        assert "dam_freshness" in src
        assert "rainfall_freshness" in src
        assert "river_freshness" in src
        # all should be computed (not None) after a fresh collect
        assert src["tide_freshness"] is not None
        assert src["dam_freshness"] is not None
        assert src["rainfall_freshness"] is not None
        # verify thresholds doc difference: dam/rainfall uses 30h/54h, tide uses 36h/72h
        # We check via freshness_for_source directly in test_freshness_distinguishes...
        # Here we at least ensure values are fresh (since just collected)
        assert src["tide_freshness"] == "fresh"
        # The fixture's daily dam date is old enough to be warning-stale at the
        # audit time; the endpoint must preserve that source-derived result.
        assert src["dam_freshness"] == "stale_warning"
    finally:
        db.close()


def test_http_exception_persists_snapshot_and_audit():
    """G6: HTTP fetch exception persists snapshot with error and audit — strictly 599."""
    from app.models import AuditLog, SourceRegistry

    db = _db()
    try:
        src = db.query(SourceRegistry).filter(SourceRegistry.name == "pdrrmo").first()
        if not src:
            from app.collectors.pdrrmo import ensure_source

            src = ensure_source(db)
        # Full approval gate — required for live fetch path
        src.enabled = True
        src.terms_reviewed_at = datetime(2026, 9, 2, 6, 0, tzinfo=UTC)
        src.approved_at = datetime(2026, 9, 2, 7, 0, tzinfo=UTC)
        src.second_reviewer = "Maria Santos"
        src.licensing_terms = "Confirmed permission — public government data, attribution required, automated retrieval approved."
        src.robots_txt = "Verified 2026-09-02: Allow: /"
        src.cadence_minutes = 0
        db.add(src)
        db.commit()
        db.refresh(src)
        db.query(SourceSnapshot).update({"fetched_at": datetime(2020, 1, 1, tzinfo=UTC)})
        db.commit()
        before_snaps = db.query(SourceSnapshot).count()
        before_audits = db.query(AuditLog).filter(AuditLog.action == "collect_failed").count()
        with patch("app.collectors.pdrrmo.fetch_with_retries", side_effect=RuntimeError("network down")):
            result = collect_pdrrmo(db, content_override=None)
            assert result["status_code"] == 599, f"expected 599 fetch exception, got {result}"
            assert result["snapshot_id"] is not None
            snap = db.query(SourceSnapshot).filter(SourceSnapshot.id == result["snapshot_id"]).first()
            assert snap is not None
            assert snap.error is not None
            assert "network down" in snap.error
            assert snap.http_status == 599
            # audit persisted
            assert db.query(AuditLog).filter(AuditLog.action == "collect_failed").count() == before_audits + 1
            assert db.query(SourceSnapshot).count() == before_snaps + 1
        # Also verify malformed page still persists snapshot (synthetic path, no network)
        before_snaps2 = db.query(SourceSnapshot).count()
        bad_html = b"<html><body>error page</body></html>"
        res2 = collect_pdrrmo(db, content_override=bad_html)
        assert res2["counts"] == {}
        assert res2["errors"]
        assert db.query(SourceSnapshot).count() == before_snaps2 + 1
    finally:
        db.close()


def test_rate_limiting_blocks_second_fetch_within_cadence():
    """G6: rate limiting respects cadence_minutes — strictly 304 and does not call fetch."""
    db = _db()
    try:
        content = FIXTURE.read_bytes()
        res1 = collect_pdrrmo(db, content_override=content)
        assert res1["status_code"] == 200
        from app.models import SourceRegistry

        src = db.query(SourceRegistry).filter(SourceRegistry.name == "pdrrmo").first()
        src.enabled = True
        src.terms_reviewed_at = datetime(2026, 9, 2, 6, 0, tzinfo=UTC)
        src.approved_at = datetime(2026, 9, 2, 7, 0, tzinfo=UTC)
        src.second_reviewer = "Maria Santos"
        src.licensing_terms = "Confirmed permission — approved"
        src.robots_txt = "Verified 2026-09-02: Allow: /"
        src.cadence_minutes = 30
        db.add(src)
        db.commit()
        # live fetch immediately after fixture run should be rate limited (elapsed < 30m) → 304
        with patch("app.collectors.pdrrmo.fetch_with_retries") as mock_fetch:
            res2 = collect_pdrrmo(db, content_override=None)
            assert res2["status_code"] == 304, f"expected rate-limited 304, got {res2}"
            assert "rate limited" in (res2.get("warnings") or [""])[0].lower() or "rate limited" in res2.get("error", "").lower()
            mock_fetch.assert_not_called(), "fetch must not be called when rate limited"
    finally:
        db.close()


def test_conditional_headers_forwarded_to_fetch():
    """G6: collector forwards If-None-Match / If-Modified-Since when present."""
    from app.models import SourceRegistry

    db = _db()
    try:
        src = db.query(SourceRegistry).filter(SourceRegistry.name == "pdrrmo").first()
        if not src:
            from app.collectors.pdrrmo import ensure_source

            src = ensure_source(db)
        src.enabled = True
        src.terms_reviewed_at = datetime(2026, 9, 2, 6, 0, tzinfo=UTC)
        src.approved_at = datetime(2026, 9, 2, 7, 0, tzinfo=UTC)
        src.second_reviewer = "Maria Santos"
        src.licensing_terms = "Confirmed permission — approved"
        src.robots_txt = "Verified 2026-09-02: Allow: /"
        src.cadence_minutes = 0
        src.last_etag = 'W/"abc123"'
        src.last_modified = "Wed, 02 Sep 2026 00:00:00 GMT"
        db.add(src)
        db.commit()
        # backdate snapshots to bypass rate limit
        db.query(SourceSnapshot).update({"fetched_at": datetime(2020, 1, 1, tzinfo=UTC)})
        db.commit()
        from app.collectors.base import FetchResult

        captured: dict = {}

        def fake_fetch(url: str, headers: dict | None = None):
            captured["headers"] = headers or {}
            captured["url"] = url
            return FetchResult(content=FIXTURE.read_bytes(), status_code=200, content_type="text/html", headers={}, url=url, fetched_at=datetime.now(UTC))

        with patch("app.collectors.pdrrmo.fetch_with_retries", side_effect=fake_fetch):
            result = collect_pdrrmo(db, content_override=None)
            assert result["status_code"] == 200
            assert captured["headers"].get("If-None-Match") == 'W/"abc123"'
            assert captured["headers"].get("If-Modified-Since") == "Wed, 02 Sep 2026 00:00:00 GMT"
    finally:
        db.close()


def test_fetch_with_retries_retries_on_transient_error():
    """G6: fetch_with_retries retries with jitter on transient failure."""
    import httpx

    from app.collectors.base import fetch_with_retries

    # Mock httpx.Client to fail first then succeed
    call_count = {"n": 0}

    class FakeResp:
        def __init__(self):
            self.status_code = 200
            self.content = b"<html>ok</html>"
            self.headers = {"content-type": "text/html"}
            self.url = "https://pdrrmo.bulacan.gov.ph/"

    class FakeClient:
        def __init__(self, *a, **kw):
            pass
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def get(self, url, **kw):
            call_count["n"] += 1
            if call_count["n"] == 1:
                raise httpx.ConnectError("transient")
            return FakeResp()

    with patch("app.collectors.base.httpx.Client", FakeClient):
        with patch("app.collectors.base.time.sleep") as mock_sleep:
            with patch("app.collectors.base.random.uniform", return_value=0.1):
                result = fetch_with_retries("https://pdrrmo.bulacan.gov.ph/")
                assert result.status_code == 200
                assert call_count["n"] == 2
                mock_sleep.assert_called_once()
                # sleep should be 2**0 + jitter = 1 + 0.1
                assert abs(mock_sleep.call_args[0][0] - 1.1) < 0.01
                assert result.headers == {"content-type": "text/html"} or result.content_type == "text/html"


def test_reparse_idempotent():
    """G6: reparse from snapshot is idempotent."""
    db = _db()
    try:
        content = FIXTURE.read_bytes()
        res = collect_pdrrmo(db, content_override=content)
        snap_id = res["snapshot_id"]
        from app.jobs.reparse import reparse_snapshot
        from app.models import SourceSnapshot

        snap = db.query(SourceSnapshot).filter(SourceSnapshot.id == snap_id).first()
        before = db.query(Observation).count()
        reparse_snapshot(db, snap, dry_run=False)
        after = db.query(Observation).count()
        assert after == before, "reparse should dedupe exact duplicates"
    finally:
        db.close()


def test_readiness_returns_503_on_failure():
    """G8: readiness returns 503 when a check fails — induced failure via DB mock."""
    from unittest.mock import MagicMock

    from app.database import get_db
    from app.main import app as _app

    client = TestClient(_app)
    # healthy case must be 200
    r_ok = client.get("/readiness")
    assert r_ok.status_code == 200
    assert r_ok.json()["ready"] is True

    # induce DB failure by overriding get_db to return a session that raises on execute
    def failing_db():
        mock_db = MagicMock()
        mock_db.execute.side_effect = Exception("db down")
        yield mock_db

    _app.dependency_overrides[get_db] = failing_db
    try:
        r_fail = client.get("/readiness")
        assert r_fail.status_code == 503, f"expected 503 on DB failure, got {r_fail.status_code}: {r_fail.text}"
        body = r_fail.json()
        assert body["ready"] is False
        assert "checks" in body
        assert body["checks"]["database"].startswith("error")
    finally:
        _app.dependency_overrides.pop(get_db, None)


def test_unknown_station_blocked_by_allowlist():
    """G4: unknown rainfall station yields parse_error and no observation."""
    html = FIXTURE.read_text(encoding="utf-8")
    from bs4 import BeautifulSoup

    from app.parsers.pdrrmo import _find_table_by_heading

    soup = BeautifulSoup(html, "lxml")
    tbl = _find_table_by_heading(soup, "Observed Rainfall")
    tbody = tbl.find("tbody")
    new_tr = soup.new_tag("tr")
    th = soup.new_tag("th", attrs={"scope": "row"})
    th.string = "Unknown Barangay X"
    td1 = soup.new_tag("td")
    td1.string = "5.0 mm"
    td2 = soup.new_tag("td")
    td2.string = "09/02/2026"
    new_tr.append(th)
    new_tr.append(td1)
    new_tr.append(td2)
    tbody.append(new_tr)
    result = parse_pdrrmo_snapshot(str(soup).encode("utf-8"))
    assert any("Unknown rainfall station" in e.message for e in result.errors)
    assert "Unknown Barangay X" not in {r.station for r in result.rainfall}


def test_invalid_source_timestamp_does_not_use_server_clock():
    """G7: invalid source date → parse_error with observed_at None, no server-clock substitution."""
    html = FIXTURE.read_text(encoding="utf-8")
    # corrupt dam date to unparseable
    html_bad = html.replace("<td>09/01/2026</td>", "<td>not-a-date</td>", 1)
    result = parse_pdrrmo_snapshot(html_bad.encode("utf-8"))
    # at least one dam should have observed_at None and a warning about dam date (not server-clock fallback)
    dam_bad = [d for d in result.dams if d.observed_at is None]
    assert len(dam_bad) >= 1, "dam with unparseable date should have observed_at None"
    assert any("Dam date unparseable" in w.message for w in result.warnings)
    # ensure no dam has observed_at close to now (server clock)
    now = datetime.now(UTC)
    for d in result.dams:
        if d.observed_at is not None:
            # valid dates are 2026-09-01 etc, not now
            assert abs((d.observed_at - now).total_seconds()) > 3600

    # also test rainfall, flooding, river, tide paths
    html_bad2 = html.replace("09/02/2026", "13/40/9999", 1)
    result2 = parse_pdrrmo_snapshot(html_bad2.encode("utf-8"))
    # At least one record should be flagged with observed_at None
    assert (
        any(r.observed_at is None for r in result2.tides)
        or any(r.observed_at is None for r in result2.dams)
        or any(r.observed_at is None for r in result2.rainfall)
        or any(r.observed_at is None for r in result2.rivers)
    )
    # when stored, quality should be parse_error not valid
    db = _db()
    try:
        collect_pdrrmo(db, content_override=html_bad.encode("utf-8"))
        # Even with one bad date, snapshot should still be stored but that row flagged parse_error
        # Find observations with parse_error and observed_at None
        bad_obs = db.query(Observation).filter(Observation.quality_state == "parse_error", Observation.observed_at.is_(None)).all()
        assert len(bad_obs) >= 1
    finally:
        db.close()


def test_observation_persistence_transactional():
    """G5: observation persistence is transactional — partial failure rolls back all observations for snapshot."""
    from app.collectors.pdrrmo import store_parsed_result
    from app.models import SourceSnapshot

    db = _db()
    try:
        # start with a good snapshot
        content = FIXTURE.read_bytes()
        collect_pdrrmo(db, content_override=content)
        before = db.query(Observation).count()
        # now attempt to store a new parsed result but inject failure mid-way
        parsed = parse_pdrrmo_snapshot(content)
        # patch _upsert_observation to fail on second call
        from app.collectors import pdrrmo as pdrrmo_mod

        orig_upsert = pdrrmo_mod._upsert_observation
        call_n = {"c": 0}

        def failing_upsert(*args, **kwargs):
            call_n["c"] += 1
            if call_n["c"] == 2:
                raise RuntimeError("injected storage failure")
            return orig_upsert(*args, **kwargs)

        # need a fresh snapshot for this test
        from app.collectors.pdrrmo import ensure_source, persist_snapshot

        source = ensure_source(db)
        fresh_snap = persist_snapshot(db, source, b"txn-test-content", 200, "text/html", {}, datetime.now(UTC))
        with patch.object(pdrrmo_mod, "_upsert_observation", side_effect=failing_upsert):
            try:
                store_parsed_result(db, source, fresh_snap, parsed, datetime.now(UTC))
                assert False, "should have raised"
            except RuntimeError:
                pass
        # after rollback, no observations from fresh_snap should be visible
        fresh_obs = db.query(Observation).filter(Observation.snapshot_id == fresh_snap.id).all()
        assert len(fresh_obs) == 0, f"partial observations leaked: {len(fresh_obs)} rows"
        # overall count should still be before (plus the fresh snapshot's 0 obs, so unchanged)
        after = db.query(Observation).count()
        assert after == before, "transactional rollback failed — observations count changed"
        # snapshot itself should still exist (audit trail) and we can add failure audit in next transaction manually
        assert db.query(SourceSnapshot).filter(SourceSnapshot.id == fresh_snap.id).first() is not None
    finally:
        db.close()
