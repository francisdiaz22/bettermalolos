"""Synthetic resident-report moderation and retention workflow.

This module intentionally rejects non-synthetic IDs. It is a workflow fixture,
not a resident-report intake endpoint.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import UTC, datetime, timedelta

from app.models.enums import ReportStatus


@dataclass(frozen=True)
class ModeratedReport:
    report_id: str
    status: ReportStatus
    created_at: datetime
    redacted_at: datetime | None = None


def _require_synthetic(report_id: str) -> None:
    if not report_id.startswith("SYN-"):
        raise ValueError("only synthetic report IDs are accepted by this workflow")


def transition(report: ModeratedReport, status: ReportStatus, now: datetime | None = None) -> ModeratedReport:
    _require_synthetic(report.report_id)
    if status == ReportStatus.redacted:
        return replace(report, status=status, redacted_at=now or datetime.now(UTC))
    if report.status == ReportStatus.redacted:
        raise ValueError("redacted reports cannot transition")
    return replace(report, status=status)


def retention_status(report: ModeratedReport, now: datetime | None = None, days: int = 30) -> ReportStatus:
    _require_synthetic(report.report_id)
    current = now or datetime.now(UTC)
    created = report.created_at.replace(tzinfo=report.created_at.tzinfo or UTC)
    return ReportStatus.expired if current - created >= timedelta(days=days) else report.status
