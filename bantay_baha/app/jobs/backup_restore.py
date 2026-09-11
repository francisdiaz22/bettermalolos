"""Safe backup/restore CLI.

Examples:
  python -m app.jobs.backup_restore backup --output /secure/bantay-baha.sql
  python -m app.jobs.backup_restore restore --input /secure/bantay-baha.sql --database-url <disposable-url> --allow-overwrite
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from app.config import get_settings
from app.services.backup import backup_database, restore_database, write_manifest


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Bantay Baha database backup/restore")
    sub = parser.add_subparsers(dest="command", required=True)

    backup = sub.add_parser("backup")
    backup.add_argument("--output", type=Path, required=True)
    backup.add_argument("--database-url", default=None)
    backup.add_argument("--manifest", type=Path, default=None)

    restore = sub.add_parser("restore")
    restore.add_argument("--input", type=Path, required=True)
    restore.add_argument("--database-url", required=True)
    restore.add_argument("--allow-overwrite", action="store_true")

    args = parser.parse_args(argv)
    if args.command == "backup":
        result = backup_database(args.database_url or get_settings().database_url, args.output)
        if args.manifest:
            write_manifest(result, args.manifest)
    else:
        result = restore_database(args.database_url, args.input, allow_overwrite=args.allow_overwrite)
    print(json.dumps(result.__dict__, indent=2))


if __name__ == "__main__":
    main()
