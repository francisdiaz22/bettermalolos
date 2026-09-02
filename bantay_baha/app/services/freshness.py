from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.models.enums import FreshnessState


def compute_freshness(
    observed_at: datetime | None,
    fetched_at: datetime | None,
    warning_after: timedelta,
    critical_after: timedelta,
    now: datetime | None = None,
) -> FreshnessState:
    if observed_at is None and fetched_at is None:
        return FreshnessState.unknown
    ref = observed_at or fetched_at
    if ref is None:
        return FreshnessState.unknown
    # ensure timezone-aware
    if ref.tzinfo is None:
        ref = ref.replace(tzinfo=UTC)
    n = now or datetime.now(UTC)
    if n.tzinfo is None:
        n = n.replace(tzinfo=UTC)
    age = n - ref
    if age >= critical_after:
        return FreshnessState.stale_critical
    if age >= warning_after:
        return FreshnessState.stale_warning
    if age < timedelta(0):
        # future observed time — treat as fresh but log anomaly; not critical
        return FreshnessState.fresh
    return FreshnessState.fresh


def freshness_for_source(
    kind: str,
    observed_at: datetime | None,
    fetched_at: datetime | None,
    now: datetime | None = None,
) -> FreshnessState:
    from app.config import get_settings

    s = get_settings()
    if kind == "tide":
        warn = timedelta(hours=s.tide_warning_hours)
        crit = timedelta(hours=s.tide_critical_hours)
    elif kind in {"dam", "rainfall_daily"}:
        warn = timedelta(hours=30)
        crit = timedelta(hours=54)
    else:
        warn = timedelta(minutes=s.freshness_warning_minutes)
        crit = timedelta(minutes=s.freshness_critical_minutes)
    return compute_freshness(observed_at, fetched_at, warn, crit, now=now)
