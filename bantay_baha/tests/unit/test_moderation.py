from datetime import UTC, datetime, timedelta

import pytest

from app.models.enums import ReportStatus
from app.services.moderation import ModeratedReport, retention_status, transition


def test_synthetic_report_moderation_and_retention() -> None:
    created = datetime(2026, 8, 1, tzinfo=UTC)
    report = ModeratedReport("SYN-100", ReportStatus.pending, created)
    verified = transition(report, ReportStatus.verified)
    assert verified.status == ReportStatus.verified
    assert retention_status(verified, created + timedelta(days=30)) == ReportStatus.expired
    redacted = transition(verified, ReportStatus.redacted, created)
    assert redacted.redacted_at == created


def test_moderation_rejects_non_synthetic_ids() -> None:
    report = ModeratedReport("RESIDENT-100", ReportStatus.pending, datetime.now(UTC))
    with pytest.raises(ValueError, match="synthetic"):
        transition(report, ReportStatus.needs_review)
