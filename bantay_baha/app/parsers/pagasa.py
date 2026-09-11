"""Fail-closed parser for the published PAGASA Flood Information page.

The page is an official human-facing HTML artifact, not a documented API.  Its
collector is therefore disabled until the source-use review is complete.  This
parser deliberately keeps the source wording and refuses to invent an issue or
expiry timestamp for a basin-status link when the page does not publish one.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from urllib.parse import urljoin
from zoneinfo import ZoneInfo

from bs4 import BeautifulSoup, Tag
from dateutil import parser as date_parser

PAGASA_PARSER_VERSION = "1.0.0"
MANILA = ZoneInfo("Asia/Manila")


@dataclass
class ParseIssue:
    message: str
    table: str


@dataclass
class BasinStatus:
    area: str
    status: str
    source_url: str


@dataclass
class DamRecord:
    name: str
    observed_at: datetime | None
    reservoir_level_m: Decimal | None
    nhwl_m: Decimal | None
    raw_text: str


@dataclass
class AdvisoryRecord:
    area: str
    level: str
    source_url: str
    raw_text: str


@dataclass
class ParsedResult:
    basins: list[BasinStatus] = field(default_factory=list)
    dams: list[DamRecord] = field(default_factory=list)
    advisories: list[AdvisoryRecord] = field(default_factory=list)
    errors: list[ParseIssue] = field(default_factory=list)
    warnings: list[ParseIssue] = field(default_factory=list)


def _text(cell: Tag) -> str:
    return " ".join(cell.stripped_strings)


def _decimal(value: str) -> Decimal | None:
    match = re.search(r"-?\d+(?:\.\d+)?", value.replace(",", ""))
    if not match:
        return None
    try:
        return Decimal(match.group())
    except InvalidOperation:
        return None


def _published_date(soup: BeautifulSoup) -> datetime | None:
    # The dam section labels its own observation date. It is the only timestamp
    # used for dam observations; basin links without a timestamp remain untimed.
    for node in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "p", "div"]):
        text = _text(node)
        if re.search(r"\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s*20\d{2}", text, re.I):
            try:
                parsed = date_parser.parse(text, fuzzy=True, default=datetime(2000, 1, 1))
                if parsed.year >= 2020:
                    return parsed.replace(tzinfo=MANILA).astimezone(UTC)
            except (OverflowError, ValueError):
                continue
    return None


def _rows(table: Tag) -> list[list[Tag]]:
    return [row.find_all(["th", "td"], recursive=False) for row in table.find_all("tr")]


def parse_pagasa_snapshot(content: bytes | str, source_url: str) -> ParsedResult:
    html = content.decode("utf-8", errors="replace") if isinstance(content, bytes) else content
    soup = BeautifulSoup(html, "lxml")
    result = ParsedResult()
    published_date = _published_date(soup)

    for table in soup.find_all("table"):
        table_text = _text(table).lower()
        if "river basins" not in table_text and "sub-basin" not in table_text:
            continue
        for cells in _rows(table):
            if len(cells) < 2:
                continue
            area, status = _text(cells[0]), _text(cells[1])
            if not area or not status or area.lower() in {"basin", "dams/reservoir (sub basin)"}:
                continue
            link = cells[1].find("a", href=True)
            link_href = link.get("href") if isinstance(link, Tag) else None
            href = urljoin(source_url, link_href) if isinstance(link_href, str) else source_url
            # Do not treat arbitrary text in an unrelated table as a flood status.
            if "flood" not in status.lower():
                continue
            record = BasinStatus(area=area, status=status, source_url=href)
            result.basins.append(record)
            result.advisories.append(AdvisoryRecord(area=area, level=status, source_url=href, raw_text=f"{area}: {status}"))

    dam_table: Tag | None = None
    for table in soup.find_all("table"):
        text = _text(table).lower()
        if "dam name" in text and "reservoir water level" in text:
            dam_table = table
            break
    if dam_table is None:
        result.errors.append(ParseIssue("Dam water-level table not found", "dam"))
    else:
        for cells in _rows(dam_table):
            values = [_text(cell) for cell in cells]
            if len(values) < 3 or values[0].lower() in {"dam name", "hr"}:
                continue
            level = _decimal(values[2])
            # Only data rows with a numeric reservoir level are acceptable.
            if level is None:
                continue
            observed_at = published_date
            if len(values) > 1 and published_date:
                try:
                    time_only = date_parser.parse(values[1], fuzzy=True, default=published_date.astimezone(MANILA))
                    observed_at = time_only.replace(tzinfo=MANILA).astimezone(UTC)
                except (OverflowError, ValueError):
                    result.warnings.append(ParseIssue(f"Unparseable dam observation time: {values[1]}", "dam"))
            if observed_at is None:
                result.warnings.append(ParseIssue(f"No published date for dam: {values[0]}", "dam"))
            result.dams.append(
                DamRecord(
                    name=values[0],
                    observed_at=observed_at,
                    reservoir_level_m=level,
                    nhwl_m=_decimal(values[4]) if len(values) > 4 else None,
                    raw_text=" | ".join(values),
                )
            )

    if not result.basins:
        result.errors.append(ParseIssue("Basin/sub-basin flood-status table not found or unrecognizable", "basin"))
    return result
