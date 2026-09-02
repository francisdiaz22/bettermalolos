from __future__ import annotations

import enum


class ObservationQuality(enum.StrEnum):
    valid = "valid"
    missing = "missing"
    stale = "stale"
    out_of_range = "out_of_range"
    parse_error = "parse_error"
    superseded = "superseded"


class ReportStatus(enum.StrEnum):
    pending = "pending"
    needs_review = "needs_review"
    verified = "verified"
    rejected = "rejected"
    expired = "expired"
    redacted = "redacted"


class PublicationState(enum.StrEnum):
    internal_only = "internal_only"
    public = "public"
    suppressed = "suppressed"


class Indicator(enum.StrEnum):
    normal = "normal"
    monitor = "monitor"
    alert = "alert"
    critical = "critical"
    unknown = "unknown"


class FreshnessState(enum.StrEnum):
    fresh = "fresh"
    stale_warning = "stale_warning"
    stale_critical = "stale_critical"
    unknown = "unknown"
