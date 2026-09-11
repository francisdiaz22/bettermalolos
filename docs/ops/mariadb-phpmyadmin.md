# Bantay Baha — MariaDB migration through phpMyAdmin

This runbook provisions the Phase B internal schema in the existing Hostinger MariaDB database. phpMyAdmin is used for schema administration only; FastAPI and scheduled collectors connect directly through SQLAlchemy/PyMySQL.

## Before importing

1. Export the selected database from phpMyAdmin and retain the backup outside the public web root. If command-line access is available, use `python -m app.jobs.backup_restore backup --output /secure/bantay-baha.sql --manifest /secure/bantay-baha.json` instead; the command keeps the database password out of process arguments.
2. Confirm the database name shown in phpMyAdmin is the intended target.
3. Confirm the target has none of the Bantay Baha tables listed by `scripts/mariadb_verify.sql`, including `source_registry`, `source_snapshot`, `observation_mapping`, `condition_selection`, `official_advisory`, `risk_assessment`, and `alembic_version`. The import is intentionally not an overwrite script.
4. Record the Hostinger database quota. Set `SNAPSHOT_DATABASE_QUOTA_BYTES` below it, leaving capacity for observations, indexes, backups, and other applications sharing the database.

## Import and verify

1. Select the database, open **Import**, choose `bantay_baha/scripts/mariadb_schema.sql`, retain UTF-8, and run the import.
2. Open **SQL**, paste/run `bantay_baha/scripts/mariadb_verify.sql`, and verify:
   - nine application/audit tables plus `alembic_version` are present and use InnoDB;
   - `schema_revision` is `005_phase_b_conditions`;
   - `raw_body_gzip` is `MEDIUMBLOB`;
   - `observation.source_published_at` exists;
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
python -m app.jobs.collect --source pdrrmo --fixture tests/fixtures/pdrrmo/sample_2026-09-02.html --once --json
python -m app.jobs.collect --source pagasa_flood --fixture tests/fixtures/pagasa/sample_flood.html --once --json
python -m app.jobs.reparse --source pdrrmo --limit 1 --dry-run
```

For the complete fixture-only acceptance check, run:

```bash
python -m app.jobs.verify_internal_milestone --output /secure/bantay-baha-evidence.json
```

This command requires revision `005_phase_b_conditions`, seeds both sources
disabled, runs each fixture twice, verifies database snapshot quota state, and
fails if either source is enabled. It does not make HTTP requests.

Then rerun `mariadb_verify.sql`. Expect two snapshots with non-null gzip bodies, parsed observations, and internal PAGASA advisory rows. Both seeded sources remain disabled/unapproved; fixture collection is synthetic and does not enable live retrieval.

## Backup/restore evidence

Export all Bantay Baha tables plus `alembic_version` from phpMyAdmin, or use the backup CLI above. Restore into a separate disposable MariaDB database with `python -m app.jobs.backup_restore restore --input /secure/bantay-baha.sql --database-url 'mysql+pymysql://...' --allow-overwrite`, then run `mariadb_verify.sql` and compare table counts, `SUM(compressed_length)`, and representative `content_hash` values with the source database. Delete the disposable copy according to the approved retention policy after recording non-sensitive evidence.

Do not enable a live collector until that source's acceptance record has real review/approval values and the MariaDB CI or equivalent disposable-server test has passed. Do not enable a production mapping until its named second-person review is recorded.
