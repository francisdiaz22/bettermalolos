# Bantay Baha — MariaDB migration through phpMyAdmin

This runbook provisions the Phase A schema in the existing Hostinger MariaDB database. phpMyAdmin is used for schema administration only; FastAPI and scheduled collectors connect directly through SQLAlchemy/PyMySQL.

## Before importing

1. Export the selected database from phpMyAdmin and retain the backup outside the public web root.
2. Confirm the database name shown in phpMyAdmin is the intended target.
3. Confirm the target has no tables named `source_registry`, `source_snapshot`, `station`, `observation`, `audit_log`, or `alembic_version`. The import is intentionally not an overwrite script.
4. Record the Hostinger database quota. Set `SNAPSHOT_DATABASE_QUOTA_BYTES` below it, leaving capacity for observations, indexes, backups, and other applications sharing the database.

## Import and verify

1. Select the database, open **Import**, choose `bantay_baha/scripts/mariadb_schema.sql`, retain UTF-8, and run the import.
2. Open **SQL**, paste/run `bantay_baha/scripts/mariadb_verify.sql`, and verify:
   - six expected tables are present and use InnoDB;
   - `schema_revision` is `004_mariadb_snapshots`;
   - `raw_body_gzip` is `MEDIUMBLOB`;
   - `uq_observation_active_key` is unique (`non_unique = 0`).
3. Do not add secrets to SQL files or screenshots. Configure `DATABASE_URL` only in the deployment secret store. URL-encode credential characters such as `@`, `:`, `/`, `?`, and `#`.

Example shape (placeholders only):

```text
mysql+pymysql://DB_USER:ENCODED_PASSWORD@DB_HOST:3306/DB_NAME?charset=utf8mb4
```

If Hostinger requires TLS, add its supported PyMySQL TLS options and CA path in the deployment environment. If it restricts remote database connections, allow the scheduler/API host according to the hosting account policy before testing connectivity.

## Safe smoke test

From the service environment:

```bash
alembic current
python -m app.jobs.seed_sources
python -m app.jobs.collect --fixture tests/fixtures/pdrrmo/sample_2026-09-02.html --once --json
python -m app.jobs.reparse --source pdrrmo --limit 1 --dry-run
```

Then rerun `mariadb_verify.sql`. Expect one snapshot with a non-null gzip body and parsed observations. The seeded source remains disabled/unapproved; fixture collection is synthetic and does not enable live scraping.

## Backup/restore evidence

Export the six Bantay Baha tables plus `alembic_version` from phpMyAdmin. Restore them into a separate disposable MariaDB database, run `mariadb_verify.sql`, and compare table counts, `SUM(compressed_length)`, and representative `content_hash` values with the source database. Delete the disposable copy according to the approved retention policy after recording non-sensitive evidence.

Do not enable the live scheduled collector until the source acceptance record has real review/approval values and the MariaDB CI or equivalent disposable-server test has passed.
