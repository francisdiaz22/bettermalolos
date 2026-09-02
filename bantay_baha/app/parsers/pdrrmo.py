"""Parsers for Bulacan PDRRMO hydrological page — pure snapshot → records.

Design goals:
- resilient to whitespace / unit punctuation / benign markup
- fail closed if required labels disappear (emit parse_error, not guesses)
- explicit conversion, Decimal for values
- timezone-aware: source dates are Asia/Manila, stored as UTC
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup, Tag

PDRRMO_PARSER_VERSION = "1.0.0"
MANILA = ZoneInfo("Asia/Manila")


@dataclass
class ParseWarning:
    message: str
    table: str | None = None


@dataclass
class ParseError:
    message: str
    table: str | None = None


@dataclass
class TideRecord:
    label: str  # Tomorrow/Today/Yesterday
    date_str: str
    time_str: str
    height_m: Decimal | None
    height_ft: Decimal | None
    observed_at: datetime | None  # UTC; None if source date unparseable — do not substitute server clock


@dataclass
class DamRecord:
    dam: str
    current_level: Decimal | None
    current_unit: str | None
    normal_level: Decimal | None
    spilling_level: Decimal | None
    date_str: str
    observed_at: datetime | None  # UTC; None if unparseable


@dataclass
class RainfallRecord:
    station: str
    rainfall_mm: Decimal | None
    date_str: str
    observed_at: datetime | None  # UTC; None if unparseable


@dataclass
class FloodingRecord:
    municipality: str
    flood_level: str
    date_str: str
    observed_at: datetime | None  # UTC; None if unparseable


@dataclass
class RiverRecord:
    station: str
    actual_level: Decimal | None
    actual_unit: str | None
    alert_level: Decimal | None
    alarm_level: Decimal | None
    critical_level: Decimal | None
    date_str: str
    observed_at: datetime | None  # UTC; None if unparseable


@dataclass
class ParsedResult:
    tides: list[TideRecord] = field(default_factory=list)
    dams: list[DamRecord] = field(default_factory=list)
    rainfall: list[RainfallRecord] = field(default_factory=list)
    flooding: list[FloodingRecord] = field(default_factory=list)
    rivers: list[RiverRecord] = field(default_factory=list)
    warnings: list[ParseWarning] = field(default_factory=list)
    errors: list[ParseError] = field(default_factory=list)
    source_published_at: datetime | None = None  # earliest? we keep latest observed


# ---------- helpers ----------

_VALUE_RE = re.compile(r"([-+]?\d+(?:\.\d+)?)")


def _parse_decimal(raw: str) -> Decimal | None:
    if raw is None:
        return None
    raw = raw.strip()
    if raw in ("-", "—", "", "N/A", "NA"):
        return None
    m = _VALUE_RE.search(raw.replace(",", ""))
    if not m:
        return None
    try:
        return Decimal(m.group(1))
    except InvalidOperation:
        return None


def _parse_unit(raw: str) -> str | None:
    raw = raw.strip().lower()
    if "mm" in raw:
        return "mm"
    if "meter" in raw or "m." in raw:
        return "m"
    if "ft" in raw:
        return "ft"
    # fallback: extract letters
    m = re.search(r"[a-zA-Z/\.]+", raw)
    return m.group(0).lower() if m else None


def _parse_date(date_str: str) -> datetime | None:
    """Parse MM/DD/YYYY optionally with time HH:MM ; returns UTC midnight/manila."""
    date_str = date_str.strip()
    if not date_str or date_str == "-":
        return None
    # tide uses MM/DD/YYYY with time separate; others use date only
    for fmt in ("%m/%d/%Y", "%m-%d-%Y", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(date_str, fmt)
            # treat as Manila date at 00:00
            return dt.replace(tzinfo=MANILA).astimezone(UTC)
        except ValueError:
            continue
    return None


def _parse_datetime(date_str: str, time_str: str) -> datetime | None:
    date_str = date_str.strip()
    time_str = time_str.strip()
    if not date_str or not time_str:
        return None
    for fmt in ("%m/%d/%Y %H:%M", "%m/%d/%Y %I:%M", "%m-%d-%Y %H:%M"):
        try:
            dt = datetime.strptime(f"{date_str} {time_str}", fmt)
            return dt.replace(tzinfo=MANILA).astimezone(UTC)
        except ValueError:
            continue
    # try with seconds
    for fmt in ("%m/%d/%Y %H:%M:%S",):
        try:
            dt = datetime.strptime(f"{date_str} {time_str}", fmt)
            return dt.replace(tzinfo=MANILA).astimezone(UTC)
        except ValueError:
            continue
    return None


def _find_table_by_heading(soup: BeautifulSoup, heading_text: str) -> Tag | None:
    """Find first table whose nearest preceding subheadline contains heading_text (case-insensitive)."""
    headings = soup.find_all(["h1", "h2", "h3"], string=re.compile(re.escape(heading_text), re.I))
    # fallback: find by text containing in subheadline class
    if not headings:
        # search all elements with text
        for el in soup.find_all(string=re.compile(re.escape(heading_text), re.I)):
            parent = el.parent
            if parent and parent.name in ("h1", "h2", "h3"):
                headings.append(parent)
                break
    for h in headings:
        # look for next table sibling
        box = h.find_parent("div", class_="box-item")
        if box:
            tbl = box.find("table")
            if tbl:
                return tbl  # type: ignore[no-any-return]
        nxt = h.find_next("table")
        if nxt:
            return nxt  # type: ignore[no-any-return]
    # last resort: search tables and check header content
    return None


def _normalize_header(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", text.strip().lower())


def _header_matches(expected: list[str], actual: list[str]) -> bool:
    """Check if expected headers are subset of actual normalized headers (order-agnostic, tolerant)."""
    norm_actual = [_normalize_header(a) for a in actual]
    for exp in expected:
        ne = _normalize_header(exp)
        if ne not in norm_actual:
            return False
    return True


def _extract_headers(table: Tag) -> list[str]:
    thead = table.find("thead")
    if thead and isinstance(thead, Tag):
        ths = thead.find_all(["th", "td"])  # type: ignore[union-attr]
        return [th.get_text(strip=True) for th in ths]
    # fallback first row
    first_tr = table.find("tr")
    if first_tr and isinstance(first_tr, Tag):
        return [c.get_text(strip=True) for c in first_tr.find_all(["th", "td"])]  # type: ignore[union-attr]
    return []


# ---------- parsers per table ----------

def _parse_tides(table: Tag, result: ParsedResult) -> None:
    headers = _extract_headers(table)
    # expected: Date, Time, Ht/m, Ht/ft (first empty col is label)
    if not _header_matches(["Date", "Time", "Ht/m"], headers):
        result.errors.append(ParseError("Tide table header mismatch: missing Date/Time/Ht/m", table="tide"))
        return
    tbody = table.find("tbody") or table  # type: ignore[assignment]
    for tr in tbody.find_all("tr"):  # type: ignore[union-attr]
        cols = [c.get_text(strip=True) for c in tr.find_all(["td", "th"])]  # type: ignore[union-attr]
        if not cols or len(cols) < 5:
            # Check for colspan no-record? tide always has data
            continue
        label, date_s, time_s, hm_s, ft_s = cols[0], cols[1], cols[2], cols[3], cols[4]
        if not date_s or not time_s:
            result.warnings.append(ParseWarning(f"Tide row missing date/time: {cols}", table="tide"))
            # still record with None observed_at to preserve original text; flagged as parse_error via quality
            hm_tmp = _parse_decimal(hm_s)
            ft_tmp = _parse_decimal(ft_s)
            result.tides.append(
                TideRecord(label=label, date_str=date_s, time_str=time_s, height_m=hm_tmp, height_ft=ft_tmp, observed_at=None)
            )
            continue
        hm = _parse_decimal(hm_s)
        ft = _parse_decimal(ft_s)
        observed = _parse_datetime(date_s, time_s)
        if hm is None or ft is None or observed is None:
            result.warnings.append(ParseWarning(f"Tide row invalid values: {cols}", table="tide"))
            if observed is None and hm is None and ft is None:
                result.errors.append(ParseError(f"Tide row unparseable: {cols}", table="tide"))
            # do not substitute server clock; keep None to be flagged as parse_error downstream
        # plausibility: tide height 0-5m, negative is impossible
        if hm is not None and (hm < 0 or hm > 10):
            result.warnings.append(ParseWarning(f"Tide height out of range: {hm} m", table="tide"))
            # still record but mark via warning; caller may flag out_of_range
        result.tides.append(
            TideRecord(label=label, date_str=date_s, time_str=time_s, height_m=hm, height_ft=ft, observed_at=observed)
        )


def _parse_dams(table: Tag, result: ParsedResult) -> None:
    headers = _extract_headers(table)
    if not _header_matches(["Dam", "Current Level"], headers):
        result.errors.append(ParseError("Dam table header mismatch", table="dam"))
        return
    # allowlist enforcement
    try:
        from app.services.station_allowlist import is_allowed  # type: ignore[assignment]
    except Exception:  # pragma: no cover
        def is_allowed(kind: str, name: str) -> bool:  # type: ignore[no-redef]
            return True

    tbody = table.find("tbody") or table  # type: ignore[assignment]
    for tr in tbody.find_all("tr"):  # type: ignore[union-attr]
        th = tr.find("th")  # type: ignore[union-attr]
        tds = tr.find_all("td")  # type: ignore[union-attr]
        if not th or len(tds) < 4:
            continue
        dam = th.get_text(strip=True)
        if dam and not is_allowed("dam", dam):
            result.errors.append(ParseError(f"Unknown dam station: {dam} — not in allowlist", table="dam"))
            continue
        current_s = tds[0].get_text(strip=True)
        normal_s = tds[1].get_text(strip=True)
        spilling_s = tds[2].get_text(strip=True)
        date_s = tds[3].get_text(strip=True)
        cur_val = _parse_decimal(current_s)
        norm_val = _parse_decimal(normal_s)
        spill_val = _parse_decimal(spilling_s)
        observed = _parse_date(date_s)
        if cur_val is not None and cur_val < 0:
            result.warnings.append(ParseWarning(f"Dam level negative: {dam} {cur_val}", table="dam"))
            # mark but still record
        if not dam or not date_s:
            result.warnings.append(ParseWarning(f"Dam row missing dam/date: {dam}/{date_s}", table="dam"))
        if observed is None:
            result.warnings.append(ParseWarning(f"Dam date unparseable: {date_s}", table="dam"))
            # do not substitute server clock — keep None and retain original text; flagged as parse_error via quality
        result.dams.append(
            DamRecord(
                dam=dam,
                current_level=cur_val,
                current_unit="m" if cur_val is not None else None,
                normal_level=norm_val,
                spilling_level=spill_val,
                date_str=date_s,
                observed_at=observed,
            )
        )


def _parse_rainfall(table: Tag, result: ParsedResult) -> None:
    headers = _extract_headers(table)
    if not _header_matches(["Station", "Rainfall"], headers):
        result.errors.append(ParseError("Rainfall table header mismatch", table="rainfall"))
        return
    try:
        from app.services.station_allowlist import is_allowed  # type: ignore[assignment]
    except Exception:  # pragma: no cover
        def is_allowed(kind: str, name: str) -> bool:  # type: ignore[no-redef]
            return True

    tbody = table.find("tbody") or table  # type: ignore[assignment]
    for tr in tbody.find_all("tr"):  # type: ignore[union-attr]
        th = tr.find("th")  # type: ignore[union-attr]
        tds = tr.find_all("td")  # type: ignore[union-attr]
        if not th or len(tds) < 2:
            continue
        station = th.get_text(strip=True)
        if station and not is_allowed("rainfall", station):
            result.errors.append(ParseError(f"Unknown rainfall station: {station} — not in allowlist", table="rainfall"))
            continue
        rainfall_s = tds[0].get_text(strip=True)
        date_s = tds[1].get_text(strip=True)
        val = _parse_decimal(rainfall_s)
        observed = _parse_date(date_s)
        if val is not None and val < 0:
            result.warnings.append(ParseWarning(f"Rainfall negative: {station} {val}", table="rainfall"))
        if observed is None:
            result.warnings.append(ParseWarning(f"Rainfall date unparseable: {date_s}", table="rainfall"))
            # do not substitute server clock — keep None and retain original text; flagged as parse_error via quality
        # val can be None → missing
        if not station:
            result.warnings.append(ParseWarning("Rainfall missing station name", table="rainfall"))
        result.rainfall.append(
            RainfallRecord(station=station, rainfall_mm=val, date_str=date_s, observed_at=observed)
        )


def _parse_flooding(table: Tag, result: ParsedResult) -> None:
    headers = _extract_headers(table)
    if not _header_matches(["Municipality", "Flood Level"], headers):
        result.errors.append(ParseError("Flooding table header mismatch", table="flooding"))
        return
    tbody = table.find("tbody") or table  # type: ignore[assignment]
    # check for "No Record!" single cell
    text = tbody.get_text(strip=True)  # type: ignore[union-attr]
    if "No Record" in text:
        return  # zero records is valid
    for tr in tbody.find_all("tr"):  # type: ignore[union-attr]
        tds = tr.find_all(["td", "th"])  # type: ignore[union-attr]
        if len(tds) < 3:
            continue
        muni = tds[0].get_text(strip=True)
        level = tds[1].get_text(strip=True)
        date_s = tds[2].get_text(strip=True)
        if "No Record" in muni or "No Record" in level:
            continue
        observed = _parse_date(date_s)
        if observed is None:
            result.warnings.append(ParseWarning(f"Flooding date unparseable: {date_s}", table="flooding"))
            # do not substitute server clock — keep None and retain original text; flagged as parse_error via quality
        result.flooding.append(FloodingRecord(municipality=muni, flood_level=level, date_str=date_s, observed_at=observed))


def _parse_rivers(table: Tag, result: ParsedResult) -> None:
    headers = _extract_headers(table)
    if not _header_matches(["Station", "Actual Level", "Alert"], headers):
        result.errors.append(ParseError("River table header mismatch", table="river"))
        return
    try:
        from app.services.station_allowlist import is_allowed  # type: ignore[assignment]
    except Exception:  # pragma: no cover
        def is_allowed(kind: str, name: str) -> bool:  # type: ignore[no-redef]
            return True

    tbody = table.find("tbody") or table  # type: ignore[assignment]
    for tr in tbody.find_all("tr"):  # type: ignore[union-attr]
        th = tr.find("th")  # type: ignore[union-attr]
        tds = tr.find_all("td")  # type: ignore[union-attr]
        if not th or len(tds) < 5:
            continue
        station = th.get_text(strip=True)
        if station and not is_allowed("river", station):
            result.errors.append(ParseError(f"Unknown river station: {station} — not in allowlist", table="river"))
            continue
        actual_s = tds[0].get_text(strip=True)
        alert_s = tds[1].get_text(strip=True)
        alarm_s = tds[2].get_text(strip=True)
        critical_s = tds[3].get_text(strip=True)
        date_s = tds[4].get_text(strip=True)
        actual = _parse_decimal(actual_s)
        alert = _parse_decimal(alert_s)
        alarm = _parse_decimal(alarm_s)
        critical = _parse_decimal(critical_s)
        observed = _parse_date(date_s)
        if actual is not None and actual < 0:
            result.warnings.append(ParseWarning(f"River level negative: {station} {actual}", table="river"))
        if observed is None:
            result.warnings.append(ParseWarning(f"River date unparseable: {date_s}", table="river"))
            # do not substitute server clock — keep None and retain original text; flagged as parse_error via quality
        result.rivers.append(
            RiverRecord(
                station=station,
                actual_level=actual,
                actual_unit="m" if actual is not None else None,
                alert_level=alert,
                alarm_level=alarm,
                critical_level=critical,
                date_str=date_s,
                observed_at=observed,
            )
        )


def parse_pdrrmo_snapshot(content: bytes | str, fetched_at: datetime | None = None) -> ParsedResult:
    """Parse raw PDRRMO HTML snapshot into typed records.

    Fail-closed: missing tables produce errors, not guessed output.
    """
    html = content.decode("utf-8", errors="replace") if isinstance(content, (bytes, bytearray)) else content
    soup = BeautifulSoup(html, "lxml")
    result = ParsedResult()

    # Check if page is clearly not the hydrological page (e.g., error page)
    if not soup.find(string=re.compile("Hydrological Information", re.I)) and not soup.find(string=re.compile("Tide Schedule|Status of Dams|Observed Rainfall|River Status", re.I)):
        result.errors.append(ParseError("Hydrological Information section not found — page layout changed or fetch returned wrong page"))
        return result

    tide_table = _find_table_by_heading(soup, "Tide Schedule")
    dam_table = _find_table_by_heading(soup, "Status of Dams")
    rain_table = _find_table_by_heading(soup, "Observed Rainfall")
    flood_table = _find_table_by_heading(soup, "Flooding Situation")
    river_table = _find_table_by_heading(soup, "River Status")

    # If no tables found via heading heuristic, fallback to searching by table headers
    if tide_table:
        _parse_tides(tide_table, result)
    else:
        result.errors.append(ParseError("Tide Schedule table not found", table="tide"))
    if dam_table:
        _parse_dams(dam_table, result)
    else:
        result.errors.append(ParseError("Status of Dams table not found", table="dam"))
    if rain_table:
        _parse_rainfall(rain_table, result)
    else:
        result.errors.append(ParseError("Observed Rainfall table not found", table="rainfall"))
    if flood_table:
        _parse_flooding(flood_table, result)
    else:
        result.errors.append(ParseError("Flooding Situation table not found", table="flooding"))
    if river_table:
        _parse_rivers(river_table, result)
    else:
        result.errors.append(ParseError("River Status Stations table not found", table="river"))

    # source_published_at = latest observed_at among records (ignore unparseable dates → None)
    all_observed: list[datetime] = []
    for t in result.tides:
        if t.observed_at is not None:
            all_observed.append(t.observed_at)
    for d in result.dams:
        if d.observed_at is not None:
            all_observed.append(d.observed_at)
    for rw in result.rainfall:
        if rw.observed_at is not None:
            all_observed.append(rw.observed_at)
    for rv in result.rivers:
        if rv.observed_at is not None:
            all_observed.append(rv.observed_at)
    for fl in result.flooding:
        if fl.observed_at is not None:
            all_observed.append(fl.observed_at)
    if all_observed:
        result.source_published_at = max(all_observed)

    return result


def parsed_result_to_dict(result: ParsedResult) -> dict[str, Any]:
    """Helper for test fixtures: serialize to JSON-able dict."""
    def dec(v: Decimal | None) -> str | None:
        return str(v) if v is not None else None
    def iso(dt: datetime | None) -> str | None:
        return dt.isoformat() if dt is not None else None
    return {
        "parser_version": PDRRMO_PARSER_VERSION,
        "tides": [
            {"label": r.label, "date": r.date_str, "time": r.time_str, "height_m": dec(r.height_m), "height_ft": dec(r.height_ft), "observed_at": iso(r.observed_at)}
            for r in result.tides
        ],
        "dams": [
            {"dam": r.dam, "current_level": dec(r.current_level), "normal_level": dec(r.normal_level), "spilling_level": dec(r.spilling_level), "date": r.date_str, "observed_at": iso(r.observed_at)}
            for r in result.dams
        ],
        "rainfall": [
            {"station": r.station, "rainfall_mm": dec(r.rainfall_mm), "date": r.date_str, "observed_at": iso(r.observed_at)}
            for r in result.rainfall
        ],
        "flooding": [
            {"municipality": r.municipality, "flood_level": r.flood_level, "date": r.date_str, "observed_at": iso(r.observed_at)}
            for r in result.flooding
        ],
        "rivers": [
            {"station": r.station, "actual": dec(r.actual_level), "alert": dec(r.alert_level), "alarm": dec(r.alarm_level), "critical": dec(r.critical_level), "date": r.date_str, "observed_at": iso(r.observed_at)}
            for r in result.rivers
        ],
        "warnings": [w.message for w in result.warnings],
        "errors": [e.message for e in result.errors],
    }
