from __future__ import annotations

from pathlib import Path

from app.parsers.pagasa import parse_pagasa_snapshot

FIXTURE = Path(__file__).parents[1] / "fixtures/pagasa/sample_flood.html"


def test_parses_basin_dam_and_source_wording_without_inventing_advisory_times():
    parsed = parse_pagasa_snapshot(FIXTURE.read_bytes(), "https://www.pagasa.dost.gov.ph/flood")
    assert not parsed.errors
    assert [(row.area, row.status) for row in parsed.basins] == [
        ("Pampanga", "Flood Watch"),
        ("Agno", "Non-Flood Watch"),
        ("Angat Sub-basin", "Non-Flood Watch"),
    ]
    assert len(parsed.advisories) == 3
    assert parsed.advisories[0].raw_text == "Pampanga: Flood Watch"
    assert len(parsed.dams) == 2
    assert str(parsed.dams[0].reservoir_level_m) == "203.00"
    assert parsed.dams[0].observed_at is not None


def test_fails_closed_when_required_tables_disappear():
    parsed = parse_pagasa_snapshot(b"<html><body>unrelated page</body></html>", "https://www.pagasa.dost.gov.ph/flood")
    assert {issue.table for issue in parsed.errors} == {"basin", "dam"}
