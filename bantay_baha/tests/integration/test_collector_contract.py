"""Integration: collector contract — snapshot-before-parse, idempotency, failure handling."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from app.collectors.pdrrmo import collect_pdrrmo
from app.database import Base, engine, session_local
from app.models import AuditLog, Observation, SourceSnapshot
from app.services.snapshot_store import compute_hash, load_snapshot

FIXTURE = Path(__file__).parents[1] / "fixtures/pdrrmo/sample_2026-09-02.html"


def setup_module():
    Base.metadata.drop_all(bind=engine())
    Base.metadata.create_all(bind=engine())


def _db() -> Session:
    return session_local()()


def test_snapshot_before_parse_and_idempotency():
    content = FIXTURE.read_bytes()
    db = _db()
    try:
        # first run
        result1 = collect_pdrrmo(db, content_override=content)
        assert result1["status_code"] == 200
        assert result1["counts"]["tide"] == 3
        assert result1["counts"]["dam"] == 3
        assert result1["counts"]["rainfall"] == 2
        assert result1["counts"]["river"] == 7
        snap_id_1 = result1["snapshot_id"]
        # snapshot exists and hash correct
        snap = db.query(SourceSnapshot).filter(SourceSnapshot.id == snap_id_1).first()
        assert snap is not None
        assert snap.content_hash == compute_hash(content)
        assert snap.object_key.startswith("database://")
        assert snap.compression == "gzip"
        assert snap.raw_body_gzip is not None
        assert snap.compressed_length == len(snap.raw_body_gzip)
        assert snap.compressed_length < snap.content_length
        assert load_snapshot(snap) == content
        # second run with identical content — idempotent observations, new snapshot with same hash
        result2 = collect_pdrrmo(db, content_override=content)
        snap_id_2 = result2["snapshot_id"]
        assert snap_id_2 != snap_id_1
        snap2 = db.query(SourceSnapshot).filter(SourceSnapshot.id == snap_id_2).first()
        assert snap2.content_hash == snap.content_hash
        # observations deduped: count distinct (station, metric, observed_at) stays same
        total_obs = db.query(Observation).count()
        # Each unique observation should not be duplicated; total should be same as first run's total distinct
        # 3 tide + 3 dam + 2 rainfall + 0 flooding + 7 river = 15
        assert total_obs == 15
        # third run with corrected value — should supersede
        html = content.decode("utf-8")
        html_corrected = html.replace("0.0 mm", "2.5 mm", 1)  # change Barangay Look 1st rainfall
        collect_pdrrmo(db, content_override=html_corrected.encode("utf-8"))
        # new observation version created, previous marked superseded
        assert db.query(Observation).count() == 16  # one superseded + new
        superseded = db.query(Observation).filter(Observation.quality_state == "superseded").all()
        assert len(superseded) >= 1
        assert all(row.active_key is None for row in superseded)
        assert db.query(Observation).filter(Observation.active_key.is_not(None)).count() == 15
    finally:
        db.close()


def test_changed_page_fails_visibly_without_corrupting_prior():
    # Malformed page should create a snapshot but produce parse_error and no new valid observations
    db = _db()
    try:
        before_count = db.query(Observation).count()
        bad_html = b"<html><body><h1>Wrong page</h1></body></html>"
        result = collect_pdrrmo(db, content_override=bad_html)
        assert result["errors"]  # parse failed closed
        assert result["counts"] == {}  # no observations stored for failed parse
        # Prior observations still intact
        after_count = db.query(Observation).count()
        assert after_count == before_count
        # Snapshot still persisted even on parse failure
        assert result["snapshot_id"] is not None
        snap = db.query(SourceSnapshot).filter(SourceSnapshot.id == result["snapshot_id"]).first()
        assert snap is not None
        assert snap.error is not None
        # audit log exists
        logs = db.query(AuditLog).filter(AuditLog.action == "collect_failed").all()
        assert len(logs) >= 1
    finally:
        db.close()


def test_negative_values_flagged_not_discarded():
    html = FIXTURE.read_text(encoding="utf-8")
    html_neg = html.replace("0.0 mm", "-3.0 mm", 1)
    db = _db()
    try:
        collect_pdrrmo(db, content_override=html_neg.encode("utf-8"))
        # Even with negative, we store but flagged out_of_range
        flagged = db.query(Observation).filter(Observation.quality_state == "out_of_range").all()
        assert len(flagged) >= 1
        assert any(o.metric == "rainfall" for o in flagged)
    finally:
        db.close()


def test_deduplicate_exact_content_hash_only_when_audit_links_remain():
    # Two identical fetches should both create snapshot records (audit links intact)
    content = FIXTURE.read_bytes()
    db = _db()
    try:
        n_before = db.query(SourceSnapshot).count()
        collect_pdrrmo(db, content_override=content)
        collect_pdrrmo(db, content_override=content)
        n_after = db.query(SourceSnapshot).count()
        assert n_after == n_before + 2
        # hashes are same, but two distinct snapshot rows
        hashes = [s.content_hash for s in db.query(SourceSnapshot).all()[-2:]]
        assert hashes[0] == hashes[1] == compute_hash(content)
    finally:
        db.close()
