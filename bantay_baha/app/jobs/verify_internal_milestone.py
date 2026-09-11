"""Run the safe, fixture-only internal deployment acceptance checks.

This command assumes the database has already been migrated. It never makes a
network request and refuses to continue if a source is enabled.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from sqlalchemy import text

from app.config import get_settings
from app.database import session_local
from app.jobs.collect import run_once
from app.jobs.seed_sources import seed
from app.models import SourceRegistry
from app.services.snapshot_store import check_snapshot_storage, database_snapshot_usage

ROOT = Path(__file__).parents[2]
REQUIRED_TABLES = {
    "source_registry",
    "source_snapshot",
    "station",
    "observation",
    "audit_log",
    "observation_mapping",
    "condition_selection",
    "official_advisory",
    "risk_assessment",
    "alembic_version",
}


def run() -> dict:
    db = session_local()()
    try:
        table_names = {
            row[0]
            for row in db.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
        } if get_settings().database_url.startswith("sqlite") else set()
        if table_names and not REQUIRED_TABLES.issubset(table_names):
            raise RuntimeError(f"database is missing required tables: {sorted(REQUIRED_TABLES - table_names)}")
        revision = db.execute(text("SELECT version_num FROM alembic_version")).scalar_one()
        if revision != "005_phase_b_conditions":
            raise RuntimeError(f"expected schema revision 005_phase_b_conditions, got {revision}")
    finally:
        db.close()

    seed()
    db = session_local()()
    try:
        sources = {source.name: source for source in db.query(SourceRegistry).all()}
        expected = {"pdrrmo", "pagasa_flood"}
        if not expected.issubset(sources):
            raise RuntimeError(f"missing seeded sources: {sorted(expected - sources.keys())}")
        if any(sources[name].enabled for name in expected):
            raise RuntimeError("fixture-only verification refuses to run with an enabled source")
    finally:
        db.close()

    pdrrmo_fixture = ROOT / "tests/fixtures/pdrrmo/sample_2026-09-02.html"
    pagasa_fixture = ROOT / "tests/fixtures/pagasa/sample_flood.html"
    first = {
        "pdrrmo": run_once("pdrrmo", str(pdrrmo_fixture)),
        "pagasa_flood": run_once("pagasa_flood", str(pagasa_fixture)),
    }
    second = {
        "pdrrmo": run_once("pdrrmo", str(pdrrmo_fixture)),
        "pagasa_flood": run_once("pagasa_flood", str(pagasa_fixture)),
    }
    if any(result.get("status_code") != 200 for result in (*first.values(), *second.values())):
        raise RuntimeError(f"fixture collection failed: {first} {second}")

    db = session_local()()
    try:
        check_snapshot_storage(db)
        usage = database_snapshot_usage(db)
        sources = {source.name: source for source in db.query(SourceRegistry).all()}
        if any(sources[name].enabled for name in ("pdrrmo", "pagasa_flood")):
            raise RuntimeError("source was enabled during verification")
        return {
            "schema_revision": "005_phase_b_conditions",
            "sources": {name: {"enabled": source.enabled, "cadence_minutes": source.cadence_minutes} for name, source in sources.items()},
            "fixture_runs": {"first": first, "second": second},
            "snapshot_database_usage_bytes": usage,
            "snapshot_quota_bytes": get_settings().snapshot_database_quota_bytes,
            "network": "not used",
            "public_exposure": False,
        }
    finally:
        db.close()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Verify the internal Bantay Baha milestone")
    parser.add_argument("--output", type=Path, default=None)
    args = parser.parse_args(argv)
    report = run()
    output = json.dumps(report, indent=2, default=str) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
    print(output, end="")


if __name__ == "__main__":
    main()
