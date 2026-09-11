from __future__ import annotations

import sqlite3
from pathlib import Path

from app.services.backup import backup_database, restore_database
from app.services.synthetic_reports import synthetic_reports_csv


def test_sqlite_backup_restore_round_trip(tmp_path: Path) -> None:
    source = tmp_path / "source.db"
    backup = tmp_path / "backup.db"
    restored = tmp_path / "restored.db"
    with sqlite3.connect(source) as db:
        db.execute("CREATE TABLE evidence (id INTEGER PRIMARY KEY, value TEXT NOT NULL)")
        db.execute("INSERT INTO evidence(value) VALUES ('fixture-only')")
        db.commit()

    result = backup_database(f"sqlite:///{source}", backup)
    assert result.backend == "sqlite"
    restore_database(f"sqlite:///{restored}", backup)
    with sqlite3.connect(restored) as db:
        assert db.execute("SELECT value FROM evidence").fetchone() == ("fixture-only",)


def test_synthetic_csv_contains_no_resident_data() -> None:
    csv_text = synthetic_reports_csv()
    assert "SYN-001" in csv_text
    assert "Synthetic fixture" in csv_text
    assert "phone" not in csv_text.lower()
    assert "email" not in csv_text.lower()
