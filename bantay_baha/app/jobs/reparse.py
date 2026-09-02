"""Reparse snapshots — recover after parser fix.

Usage:
  python -m app.jobs.reparse --snapshot-id <id>
  python -m app.jobs.reparse --source pdrrmo --limit 20
  python -m app.jobs.reparse --all --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys

from sqlalchemy.orm import Session

from app.collectors.pdrrmo import store_parsed_result
from app.database import Base, engine, session_local
from app.logging_config import get_logger, setup_logging
from app.models import SourceRegistry, SourceSnapshot
from app.parsers.pdrrmo import parse_pdrrmo_snapshot
from app.services.snapshot_store import load_snapshot

logger = get_logger(__name__)


def reparse_snapshot(db: Session, snapshot: SourceSnapshot, dry_run: bool = False) -> dict:
    source = db.query(SourceRegistry).filter(SourceRegistry.id == snapshot.source_id).first()
    if not source:
        return {"error": "source not found", "snapshot_id": snapshot.id}
    # load raw body
    try:
        content = load_snapshot(snapshot)
    except Exception as exc:
        return {"error": f"load failed: {exc}", "snapshot_id": snapshot.id}

    parsed = parse_pdrrmo_snapshot(content, fetched_at=snapshot.fetched_at)
    if dry_run:
        return {
            "snapshot_id": snapshot.id,
            "dry_run": True,
            "counts": {"tide": len(parsed.tides), "dam": len(parsed.dams), "rainfall": len(parsed.rainfall), "river": len(parsed.rivers), "flooding": len(parsed.flooding)},
            "errors": [e.message for e in parsed.errors],
            "warnings": [w.message for w in parsed.warnings],
        }
    # atomic: if required table errors, do not store
    from app.collectors.pdrrmo import REQUIRED_TABLES

    required_errors = [e for e in parsed.errors if e.table in REQUIRED_TABLES]
    if required_errors:
        snapshot.error = "; ".join([e.message for e in parsed.errors])
        db.add(snapshot)
        db.commit()
        return {"snapshot_id": snapshot.id, "error": "required table parse error", "errors": [e.message for e in parsed.errors]}

    counts = store_parsed_result(db, source, snapshot, parsed, snapshot.fetched_at)
    snapshot.parser_version = parsed.__class__.__name__  # keep original? use PDRRMO_PARSER_VERSION
    from app.parsers.pdrrmo import PDRRMO_PARSER_VERSION

    snapshot.parser_version = PDRRMO_PARSER_VERSION
    db.add(snapshot)
    db.commit()
    return {"snapshot_id": snapshot.id, "counts": counts, "errors": [e.message for e in parsed.errors], "warnings": [w.message for w in parsed.warnings]}


def main(argv: list[str] | None = None) -> None:
    setup_logging("INFO")
    parser = argparse.ArgumentParser(description="Bantay Baha reparse")
    parser.add_argument("--snapshot-id", default=None, help="reparse single snapshot")
    parser.add_argument("--source", default="pdrrmo", help="source name")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--all", action="store_true", help="reparse all snapshots for source")
    parser.add_argument("--dry-run", action="store_true", help="do not write observations")
    args = parser.parse_args(argv)

    Base.metadata.create_all(bind=engine())
    db = session_local()()
    try:
        if args.snapshot_id:
            snap = db.query(SourceSnapshot).filter(SourceSnapshot.id == args.snapshot_id).first()
            if not snap:
                print(f"snapshot {args.snapshot_id} not found")
                sys.exit(1)
            res = reparse_snapshot(db, snap, dry_run=args.dry_run)
            print(json.dumps(res, indent=2))
            return

        src = db.query(SourceRegistry).filter(SourceRegistry.name == args.source).first()
        if not src:
            print(f"source {args.source} not found")
            sys.exit(1)
        q = db.query(SourceSnapshot).filter(SourceSnapshot.source_id == src.id).order_by(SourceSnapshot.fetched_at.desc())
        if not args.all:
            q = q.limit(args.limit)
        snaps = q.all()
        if not snaps:
            print("no snapshots")
            return
        for snap in snaps:
            res = reparse_snapshot(db, snap, dry_run=args.dry_run)
            print(json.dumps(res))

    finally:
        db.close()


if __name__ == "__main__":
    main()
