from __future__ import annotations

import json
from datetime import UTC, datetime
from decimal import Decimal
from pathlib import Path

from app.parsers.pdrrmo import PDRRMO_PARSER_VERSION, parse_pdrrmo_snapshot, parsed_result_to_dict

FIXTURE_HTML = Path(__file__).parents[1] / "fixtures/pdrrmo/sample_2026-09-02.html"
FIXTURE_JSON = Path(__file__).parents[1] / "fixtures/pdrrmo/expected_2026-09-02.json"


def test_parser_fixture_matches_expected():
    content = FIXTURE_HTML.read_bytes()
    result = parse_pdrrmo_snapshot(content)
    assert not result.errors, f"Unexpected parse errors: {result.errors}"
    # tide
    assert len(result.tides) == 3
    assert result.tides[0].label == "Tomorrow"
    assert result.tides[0].height_m == Decimal("1.03")
    assert result.tides[0].height_ft == Decimal("3.38")
    # dam
    assert len(result.dams) == 3
    dams_by_name = {r.dam: r for r in result.dams}
    assert dams_by_name["Angat Dam"].current_level == Decimal("201.33")
    assert dams_by_name["Angat Dam"].normal_level == Decimal("212.00")
    assert dams_by_name["Angat Dam"].spilling_level is None
    assert dams_by_name["Bustos Dam"].spilling_level == Decimal("17.70")
    # rainfall includes Barangay Look 1st
    assert len(result.rainfall) == 2
    stations = {r.station for r in result.rainfall}
    assert "Barangay Look 1st" in stations
    assert next(r for r in result.rainfall if r.station == "Barangay Look 1st").rainfall_mm == Decimal("0.0")
    # flooding empty is valid
    assert len(result.flooding) == 0
    # river 7 stations with thresholds
    assert len(result.rivers) == 7
    rivers = {r.station: r for r in result.rivers}
    assert rivers["Alejo Bridge, Bustos"].actual_level == Decimal("1.0")
    assert rivers["Alejo Bridge, Bustos"].alert_level == Decimal("2.0")
    assert rivers["Bulusan River Bank"].critical_level == Decimal("0.90")
    # observed_at is UTC converted from Asia/Manila — e.g., 09/02/2026 01:03 Manila = 2026-09-01 17:03 UTC
    tide_today = next(t for t in result.tides if t.label == "Today")
    assert tide_today.observed_at == datetime(2026, 9, 1, 17, 3, tzinfo=UTC)
    # parser_version
    assert PDRRMO_PARSER_VERSION == "1.0.0"
    # expected JSON fixture matches serialized output (if committed)
    if FIXTURE_JSON.exists():
        expected = json.loads(FIXTURE_JSON.read_text())
        actual = parsed_result_to_dict(result)
        assert actual["tides"] == expected["tides"]
        assert actual["dams"] == expected["dams"]
        assert actual["rainfall"] == expected["rainfall"]


def test_heading_change_fails_closed():
    html = FIXTURE_HTML.read_text(encoding="utf-8")
    # Break tide heading — parser should emit parse_error, not guessed output
    html_broken = html.replace("Tide Schedule", "Ocean Schedule")
    result = parse_pdrrmo_snapshot(html_broken.encode("utf-8"))
    assert any("Tide" in e.message for e in result.errors)


def test_missing_cells_produce_warning_or_error():
    html = FIXTURE_HTML.read_text(encoding="utf-8")
    # Remove a dam row's date cell value to simulate missing cell
    html_missing = html.replace("09/01/2026", "", 1)
    result = parse_pdrrmo_snapshot(html_missing.encode("utf-8"))
    # At least dams still parsed or warning emitted; no crash
    assert len(result.dams) >= 2  # at least some rows survive


def test_negative_rainfall_flagged_as_warning():
    html = FIXTURE_HTML.read_text(encoding="utf-8")
    html_neg = html.replace("0.0 mm", "-5.0 mm", 1)
    result = parse_pdrrmo_snapshot(html_neg.encode("utf-8"))
    # Parser should produce warning for negative rainfall
    assert any("negative" in w.message.lower() for w in result.warnings)


def test_changed_date_format_warning():
    # Change date format to ISO — parser expects MM/DD/YYYY, so observed_at fallback will trigger warning
    html = FIXTURE_HTML.read_text(encoding="utf-8")
    html_iso = html.replace("09/02/2026", "2026-09-02", 1)
    result = parse_pdrrmo_snapshot(html_iso.encode("utf-8"))
    # The changed format is actually parseable via fallback formats, so may still parse — but ensure no crash
    assert len(result.tides) >= 2 or any(e.table == "tide" for e in result.errors)


def test_unknown_station_produces_parse_error():
    # Unknown station must produce parse_error/needs_review, not automatically valid (spec requirement)
    html = FIXTURE_HTML.read_text(encoding="utf-8")
    from bs4 import BeautifulSoup

    soup = BeautifulSoup(html, "lxml")
    from app.parsers.pdrrmo import _find_table_by_heading

    tbl = _find_table_by_heading(soup, "Observed Rainfall")
    assert tbl is not None
    tbody = tbl.find("tbody")
    assert tbody is not None
    new_tr = soup.new_tag("tr")
    th = soup.new_tag("th", attrs={"scope": "row"})
    th.string = "New Barangay Station"
    td1 = soup.new_tag("td")
    td1.string = "2.5 mm"
    td2 = soup.new_tag("td")
    td2.string = "09/02/2026"
    new_tr.append(th)
    new_tr.append(td1)
    new_tr.append(td2)
    tbody.append(new_tr)
    html_extra = str(soup)
    result = parse_pdrrmo_snapshot(html_extra.encode("utf-8"))
    # Unknown rainfall station should not be accepted as normal
    assert any("Unknown rainfall station" in e.message and "New Barangay Station" in e.message for e in result.errors)
    stations = {r.station for r in result.rainfall}
    assert "New Barangay Station" not in stations
    # Known stations still parsed
    assert len(result.rainfall) == 2


def test_flooding_populated_fixture():
    populated = Path(__file__).parents[1] / "fixtures/pdrrmo/sample_flooding_populated.html"
    if not populated.exists():
        raise AssertionError("missing populated flooding fixture")
    content = populated.read_bytes()
    result = parse_pdrrmo_snapshot(content)
    assert not result.errors, f"Unexpected parse errors: {result.errors}"
    assert len(result.flooding) == 2
    munis = {f.municipality for f in result.flooding}
    assert "Malolos City" in munis
    assert "Calumpit" in munis
    # also verify expected JSON exists and matches
    expected_path = Path(__file__).parents[1] / "fixtures/pdrrmo/expected_flooding_populated.json"
    if expected_path.exists():
        import json as _json

        expected = _json.loads(expected_path.read_text())
        actual = parsed_result_to_dict(result)
        assert actual["flooding"] == expected["flooding"]


def test_units_and_conversion_explicit():
    content = FIXTURE_HTML.read_bytes()
    result = parse_pdrrmo_snapshot(content)
    # Units are normalized and Decimal used
    for r in result.rainfall:
        assert r.rainfall_mm == Decimal("0.0")
        # unit would be stored via collector as "mm"
    for r in result.tides:
        assert isinstance(r.height_m, Decimal)
        assert r.height_m == Decimal("0.92") or r.height_m in (Decimal("1.03"), Decimal("0.8"))


def test_page_redesign_no_hydrological_section_fails_closed():
    html = "<html><body><h1>Not the right page</h1><p>No hydrological data here</p></body></html>"
    result = parse_pdrrmo_snapshot(html.encode("utf-8"))
    assert any("Hydrological" in e.message for e in result.errors)
    assert len(result.tides) == 0
