from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.models.enums import FreshnessState
from app.services.freshness import compute_freshness, freshness_for_source


def test_fresh_within_warning():
    now = datetime(2026, 9, 2, 12, 0, tzinfo=UTC)
    observed = now - timedelta(minutes=10)
    state = compute_freshness(observed, observed, timedelta(minutes=45), timedelta(minutes=90), now=now)
    assert state == FreshnessState.fresh


def test_stale_warning():
    now = datetime(2026, 9, 2, 12, 0, tzinfo=UTC)
    observed = now - timedelta(minutes=50)
    state = compute_freshness(observed, observed, timedelta(minutes=45), timedelta(minutes=90), now=now)
    assert state == FreshnessState.stale_warning


def test_stale_critical():
    now = datetime(2026, 9, 2, 12, 0, tzinfo=UTC)
    observed = now - timedelta(minutes=100)
    state = compute_freshness(observed, observed, timedelta(minutes=45), timedelta(minutes=90), now=now)
    assert state == FreshnessState.stale_critical


def test_unknown_when_no_timestamps():
    state = compute_freshness(None, None, timedelta(minutes=45), timedelta(minutes=90))
    assert state == FreshnessState.unknown


def test_tide_thresholds_longer():
    now = datetime(2026, 9, 2, 12, 0, tzinfo=UTC)
    observed = now - timedelta(hours=30)
    # hydrology staleness is 45m/90m, tide is 36h/72h
    state_tide = freshness_for_source("tide", observed, observed, now=now)
    state_hydro = freshness_for_source("river", observed, observed, now=now)
    assert state_tide == FreshnessState.fresh  # 30h < 36h
    assert state_hydro == FreshnessState.stale_critical  # 30h >> 90m
