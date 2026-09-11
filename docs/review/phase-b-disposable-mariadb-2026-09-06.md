# Phase B disposable MariaDB verification — 6 September 2026

## Scope

This is non-production evidence for the Phase B database and internal-status contracts. It does not approve PAGASA source use, create a production source mapping, migrate Hostinger, or constitute a live collection. Both sources remained disabled and unapproved throughout the run.

## Environment

- MariaDB `12.3.3-MariaDB`, isolated in a temporary data directory and private Unix socket
- Python 3.12 temporary virtual environment using the dependencies declared by `bantay_baha/pyproject.toml`
- Schema imported from `bantay_baha/scripts/mariadb_schema.sql`
- PDRRMO and PAGASA synthetic fixtures from `bantay_baha/tests/fixtures`

## Results

- Alembic revision: `005_phase_b_conditions (head)`
- Expected application/audit tables plus `alembic_version`: 10
- `source_snapshot.raw_body_gzip`: `MEDIUMBLOB`
- `uq_observation_active_key`: unique (`non_unique=0`)
- Snapshots: 2; tracked gzip bytes: 17,403; missing database bodies: 0
- Observations: 20; observations with a source-published timestamp: 2
- Official PAGASA advisory rows: 3
- Audit rows: 2
- Production mappings: 0
- Authenticated `GET /v1/ops/status`: HTTP 200, ruleset `phase-b-internal-v1`, selection `unknown`, `score=null`, `display_state=unknown`, `publication_state=internal_only`
- Registry gates: both sources `enabled=false`, `terms_reviewed_at=NULL`, `approved_at=NULL`, `second_reviewer='pending'`

Fixture collector results:

- PDRRMO: 3 tide, 3 dam, 2 rainfall, 0 flooding, 7 river, 0 errors
- PAGASA: 3 basin/sub-basin, 2 dam, 3 advisory, 0 errors

## Backup and restore comparison

The source database was exported with `mariadb-dump --single-transaction --routines --triggers`, restored into a separate empty database, and compared without exposing raw content:

| Copy | Snapshots | Observations | Advisories | Audits | Gzip bytes | Snapshot-hash manifest |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Source | 2 | 20 | 3 | 2 | 17,403 | `01751414ad01ed350af204853fbbfa1d` |
| Restored | 2 | 20 | 3 | 2 | 17,403 | `01751414ad01ed350af204853fbbfa1d` |

The counts, compressed-byte total, and digest of the ordered snapshot content hashes matched exactly.

## Automated checks

- `pytest -q`: 49 passed; two upstream TestClient deprecation warnings
- `ruff check app tests migrations`: passed
- `mypy app --ignore-missing-imports`: passed, 33 source files

## Remaining production gates

1. Written PAGASA clarification and BetterMalolos owner approval.
2. Named primary and second BetterMalolos reviewers, followed by explicit review of each proposed production mapping.
3. Backup, migration, and verification of the intended Hostinger database.
4. One approved live PAGASA collection with retained snapshot/parse/audit and restore evidence.
5. Internal status verification against the approved production mappings while unmapped fields remain `unknown`.
