"""One-command collector CLI: fetch → snapshot (before parse) → parse → store.

Usage:
  python -m app.jobs.collect --once
  python -m app.jobs.collect --source pdrrmo --once
  python -m app.jobs.collect --fixture tests/fixtures/pdrrmo/sample.html
  bantay-baha --once
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.collectors.pdrrmo import collect_pdrrmo
from app.database import Base, engine, session_local
from app.logging_config import get_logger, setup_logging

logger = get_logger(__name__)


def run_once(source: str = "pdrrmo", fixture: str | None = None) -> dict:
    Base.metadata.create_all(bind=engine())
    db = session_local()()
    try:
        if fixture:
            content = Path(fixture).read_bytes()
            result = collect_pdrrmo(db, content_override=content)
        else:
            if source != "pdrrmo":
                raise ValueError(f"Unknown source {source} — only pdrrmo is available in Phase A")
            result = collect_pdrrmo(db)
        return result
    finally:
        db.close()


def main(argv: list[str] | None = None) -> None:
    setup_logging("INFO")
    parser = argparse.ArgumentParser(description="Bantay Baha collector (Phase A)")
    parser.add_argument("--source", default="pdrrmo", help="source name (default: pdrrmo)")
    parser.add_argument("--once", action="store_true", help="run one collection cycle")
    parser.add_argument("--fixture", default=None, help="path to HTML fixture (skips HTTP fetch)")
    parser.add_argument("--json", action="store_true", help="output JSON")
    args = parser.parse_args(argv)

    if not args.once and not args.fixture:
        parser.print_help()
        print("\nHint: add --once to run a collection")
        sys.exit(1)

    result = run_once(source=args.source, fixture=args.fixture)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(f"snapshot_id={result.get('snapshot_id')}")
        print(f"status={result.get('status_code')}")
        print(f"counts={result.get('counts')}")
        if result.get("errors"):
            print(f"errors={result['errors']}")
        if result.get("warnings"):
            print(f"warnings={result['warnings'][:5]}")
    # exit non-zero on hard failure — fail closed but preserve snapshot/audit
    # HTTP non-200 (including 503 approval gate, 599 fetch error) → job must fail
    if result.get("status_code") and result["status_code"] != 200:
        # 304 Not Modified is not a failure — it means no new data due to cadence/conditional request
        if result["status_code"] != 304:
            sys.exit(2)
    # parser failed closed — required table missing or wholly unrecognizable page
    # counts=={} with errors means no observations were stored; surface as failure while audit snapshot remains
    if result.get("errors") and not result.get("counts"):
        # empty dict {} is falsy; also handle {"tide":0,...} not relevant — check if no truthy counts
        has_data = any(v for v in result["counts"].values()) if isinstance(result.get("counts"), dict) else False
        if not has_data:
            sys.exit(2)


if __name__ == "__main__":
    main()
