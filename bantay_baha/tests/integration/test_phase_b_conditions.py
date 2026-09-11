from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path

from app.collectors.pagasa import collect_pagasa
from app.database import Base, engine, session_local
from app.models import Observation, ObservationMapping, SourceRegistry, Station
from app.models.enums import Indicator
from app.services.conditions import compute_internal_assessment, select_condition

FIXTURE = Path(__file__).parents[1] / "fixtures/pagasa/sample_flood.html"


def setup_module():
    Base.metadata.drop_all(bind=engine())
    Base.metadata.create_all(bind=engine())


def _mapping(db, source, station_id: str, role: str = "primary"):
    return ObservationMapping(
        public_field="malolos_equivalent_river_level",
        source_id=source.id,
        source_station_id=station_id,
        metric="dam_level",
        unit_datum="m",
        geographic_scope="Synthetic test scope only",
        aggregation_period="instantaneous",
        timestamp_semantics="published observation time",
        role=role,
        priority=1,
        mapping_version="test-v1",
        rationale="Synthetic equivalence test only",
        reviewed_by="Test reviewer",
        reviewed_at=datetime.now(UTC),
        enabled=True,
    )


def test_pagasa_fixture_collects_but_live_source_starts_disabled():
    db = session_local()()
    try:
        result = collect_pagasa(db, content_override=FIXTURE.read_bytes())
        assert result["status_code"] == 200
        assert result["counts"] == {"basin": 3, "dam": 2, "advisory": 3, "errors": 0}
        source = db.query(SourceRegistry).filter(SourceRegistry.name == "pagasa_flood").one()
        assert source.enabled is False
        assert source.expected_update_frequency is not None
        assert len(source.expected_update_frequency) <= 128
        assert db.query(Observation).filter(Observation.metric == "dam_level").count() == 2
    finally:
        db.close()


def test_unknown_without_reviewed_mapping_and_stale_primary_is_historical_only():
    db = session_local()()
    try:
        unknown = select_condition(db, "malolos_equivalent_river_level")
        assert unknown.selection_state == "unknown"
        source = db.query(SourceRegistry).filter(SourceRegistry.name == "pagasa_flood").one()
        source.enabled = True
        db.add(_mapping(db, source, "dam:angat"))
        fresh_observation = (
            db.query(Observation)
            .join(Station, Observation.station_id == Station.id)
            .filter(Station.source_id == source.id, Station.source_station_id == "dam:angat")
            .one()
        )
        fresh_observation.source_published_at = datetime.now(UTC)
        db.commit()
        selected = select_condition(db, "malolos_equivalent_river_level")
        assert selected.selection_state == "fresh_primary"
        observation = db.get(Observation, selected.selected_observation_id)
        assert observation is not None
        observation.source_published_at = datetime.now(UTC) - timedelta(hours=2)
        db.commit()
        stale = select_condition(db, "malolos_equivalent_river_level")
        assert stale.selection_state == "historical_stale"
        assert stale.selected_observation_id is None
        assert stale.historical_observation_id == observation.id
    finally:
        db.close()


def test_internal_score_is_unknown_when_core_mapping_is_missing():
    db = session_local()()
    try:
        db.query(ObservationMapping).delete()
        db.commit()
        assessment = compute_internal_assessment(db)
        assert assessment.display_state == Indicator.unknown.value
        assert assessment.score is None
    finally:
        db.close()


def test_fresh_reviewed_fallback_beats_stale_primary_and_is_attributed():
    db = session_local()()
    try:
        source = db.query(SourceRegistry).filter(SourceRegistry.name == "pagasa_flood").one()
        source.enabled = True
        db.query(ObservationMapping).delete()
        primary = (
            db.query(Observation)
            .join(Station, Observation.station_id == Station.id)
            .filter(Station.source_id == source.id, Station.source_station_id == "dam:angat")
            .one()
        )
        fallback = (
            db.query(Observation)
            .join(Station, Observation.station_id == Station.id)
            .filter(Station.source_id == source.id, Station.source_station_id == "dam:ipo")
            .one()
        )
        primary.source_published_at = datetime.now(UTC) - timedelta(hours=2)
        fallback.source_published_at = datetime.now(UTC)
        db.add(_mapping(db, source, "dam:angat", role="primary"))
        db.add(_mapping(db, source, "dam:ipo", role="fallback"))
        db.commit()
        selection = select_condition(db, "malolos_equivalent_river_level")
        assert selection.selection_state == "fresh_mapped_fallback"
        assert selection.selected_observation_id == fallback.id
        assert selection.historical_observation_id is None
    finally:
        db.close()


def test_ruleset_thresholds_are_deterministic_when_a_complete_mapping_exists():
    db = session_local()()
    try:
        source = db.query(SourceRegistry).filter(SourceRegistry.name == "pagasa_flood").one()
        source.enabled = True
        db.query(ObservationMapping).delete()
        observation = (
            db.query(Observation)
            .join(Station, Observation.station_id == Station.id)
            .filter(Station.source_id == source.id, Station.source_station_id == "dam:angat")
            .one()
        )
        observation.source_published_at = datetime.now(UTC)
        observation.value = 0
        db.add(_mapping(db, source, "dam:angat"))
        db.commit()
        assert compute_internal_assessment(db).display_state == Indicator.normal.value
        observation.value = 3
        db.commit()
        assert compute_internal_assessment(db).display_state == Indicator.critical.value
    finally:
        db.close()
