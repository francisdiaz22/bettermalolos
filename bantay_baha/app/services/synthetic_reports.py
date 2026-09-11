"""Synthetic situation-report rows for internal workflow and CSV QA only."""
from __future__ import annotations

import csv
import io
from dataclasses import dataclass


@dataclass(frozen=True)
class SyntheticReport:
    report_id: str
    barangay: str
    category: str
    status: str
    observed_at: str
    notes: str


SYNTHETIC_REPORTS = (
    SyntheticReport("SYN-001", "Bulihan", "street_flooding", "needs_review", "2026-09-11T08:00:00+08:00", "Synthetic fixture"),
    SyntheticReport("SYN-002", "Atlag", "rainfall", "verified", "2026-09-11T08:30:00+08:00", "Synthetic fixture"),
    SyntheticReport("SYN-003", "Tikay", "blocked_drainage", "rejected", "2026-09-11T09:00:00+08:00", "Synthetic fixture"),
)


def synthetic_reports_csv() -> str:
    output = io.StringIO()
    writer = csv.DictWriter(writer_file := output, fieldnames=list(SyntheticReport.__dataclass_fields__))
    writer.writeheader()
    writer.writerows(report.__dict__ for report in SYNTHETIC_REPORTS)
    return writer_file.getvalue()
