"""Database backup and restore helpers for disposable/internal environments.

SQLite is supported natively for local fixture evidence.  MariaDB/MySQL uses
the vendor command-line tools so credentials never appear in the command
arguments or in a generated backup manifest.
"""
from __future__ import annotations

import json
import os
import sqlite3
import subprocess
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from urllib.parse import unquote

from sqlalchemy.engine import make_url


@dataclass(frozen=True)
class BackupResult:
    path: str
    backend: str
    created_at: str
    bytes: int


def _backend(database_url: str) -> str:
    return "sqlite" if database_url.startswith("sqlite") else "mariadb"


def _mariadb_args(database_url: str) -> tuple[list[str], dict[str, str]]:
    url = make_url(database_url)
    if not url.host or not url.database:
        raise ValueError("MariaDB backup requires a URL with host and database")
    args = [
        "--single-transaction",
        "--routines",
        "--triggers",
        "--events",
        "--hex-blob",
        "--host",
        url.host,
        "--port",
        str(url.port or 3306),
        "--user",
        unquote(url.username or ""),
        url.database,
    ]
    env = os.environ.copy()
    if url.password is not None:
        env["MYSQL_PWD"] = unquote(url.password)
    return args, env


def backup_database(database_url: str, destination: Path) -> BackupResult:
    """Create a point-in-time logical backup without changing the database."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    backend = _backend(database_url)
    if backend == "sqlite":
        source = Path(make_url(database_url).database or "")
        if not source.exists():
            raise FileNotFoundError(f"SQLite database does not exist: {source}")
        with sqlite3.connect(source) as source_db, sqlite3.connect(destination) as backup_db:
            source_db.backup(backup_db)
    else:
        args, env = _mariadb_args(database_url)
        try:
            subprocess.run(
                ["mysqldump", *args, "--result-file", str(destination)],
                check=True,
                env=env,
                capture_output=True,
                text=True,
            )
        except FileNotFoundError as exc:
            raise RuntimeError("mysqldump is required for MariaDB backups") from exc
    return BackupResult(
        path=str(destination),
        backend=backend,
        created_at=datetime.now(UTC).isoformat(),
        bytes=destination.stat().st_size,
    )


def restore_database(database_url: str, backup: Path, *, allow_overwrite: bool = False) -> BackupResult:
    """Restore into a disposable target; overwrite must be explicit."""
    if not backup.exists():
        raise FileNotFoundError(f"backup does not exist: {backup}")
    backend = _backend(database_url)
    if backend == "sqlite":
        target = Path(make_url(database_url).database or "")
        if target.exists() and not allow_overwrite:
            raise FileExistsError(f"restore target exists; pass allow_overwrite=True: {target}")
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists():
            target.unlink()
        with sqlite3.connect(backup) as backup_db, sqlite3.connect(target) as target_db:
            backup_db.backup(target_db)
    else:
        if not allow_overwrite:
            raise ValueError("MariaDB restore requires explicit allow_overwrite=True")
        args, env = _mariadb_args(database_url)
        try:
            with backup.open("rb") as stream:
                subprocess.run(["mysql", *args], stdin=stream, check=True, env=env, capture_output=True)
        except FileNotFoundError as exc:
            raise RuntimeError("mysql client is required for MariaDB restores") from exc
    return BackupResult(
        path=str(backup),
        backend=backend,
        created_at=datetime.now(UTC).isoformat(),
        bytes=backup.stat().st_size,
    )


def write_manifest(result: BackupResult, destination: Path) -> None:
    """Write non-secret evidence next to a backup."""
    destination.write_text(json.dumps(asdict(result), indent=2) + "\n", encoding="utf-8")
