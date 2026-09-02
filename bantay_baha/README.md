# Bantay Baha — Python Automation Service

> Decision-support and information service. Not an official forecast or emergency-dispatch system.

This service (Phase A) collects published hydrology data from Bulacan PDRRMO, persists immutable raw snapshots, parses them into typed observations, and exposes internal health/freshness endpoints. The public BetterMalolos site remains `Proposed` until later phases.

## Architecture (Phase A)

```
Official pages → collectors → immutable gzip raw snapshots → parsers → MariaDB
                                                  │
                                          health / freshness → internal API
```

- Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, MariaDB/MySQL via PyMySQL, httpx + BeautifulSoup/lxml
- Timestamps stored as UTC, rendered as Asia/Manila
- Snapshot bodies are gzip-compressed in `source_snapshot.raw_body_gzip`; observations are idempotent with correction-as-new-version semantics

## Quick start (local, no Docker)

```bash
# 1. Create venv (use Python 3.12)
python3.12 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# 2. Configure
cp .env.example .env
# Edit DATABASE_URL for your MariaDB/MySQL server. URL-encode special characters in credentials.

# 3. Migrate
alembic upgrade head

# 4. Seed source_registry
python -m app.jobs.seed_sources

# 5. Run API
uvicorn app.main:app --reload --port 8001

# 6. One-command collector (fetch → snapshot → parse → store)
python -m app.jobs.collect --source pdrrmo --once
# or
bantay-baha --once
```

Health checks:

- `GET /health` — liveness
- `GET /readiness` — DB + storage + migration state
- `GET /v1/ops/health/sources` — per-source freshness & last run
- `GET /v1/ops/snapshots?source=pdrrmo&limit=20`
- `POST /v1/ops/collect` — trigger collector (requires `OPS_API_TOKEN` if set)

## Hostinger/phpMyAdmin deployment

phpMyAdmin creates/imports the schema; the Python service still connects directly to MariaDB at runtime.

1. Back up the target database and confirm it does not already contain Bantay Baha tables.
2. In Hostinger phpMyAdmin, select the intended database, choose **Import**, and import `scripts/mariadb_schema.sql`.
3. Run `scripts/mariadb_verify.sql` and confirm the schema revision is `004_mariadb_snapshots`.
4. Set the deployment secret to `mysql+pymysql://USER:PASSWORD@HOST:3306/DATABASE?charset=utf8mb4`. Percent-encode special characters in the username/password. Add provider-required TLS query options where applicable.
5. Keep `STORAGE_BACKEND=database` and choose quota limits below the Hostinger database allocation.
6. Run `python -m app.jobs.seed_sources`, then a fixture collection before any approved live collection.

The import is for a new/empty MariaDB schema. Do not import it over a partial schema. If command-line access is available, `alembic upgrade head` is the equivalent managed migration path. Scheduled collection intentionally has no DDL permission and only verifies the recorded schema revision.

See the complete [phpMyAdmin migration and restore runbook](../docs/ops/mariadb-phpmyadmin.md).

## Docker Compose (MariaDB)

```bash
docker compose up --build
# API at http://localhost:8001
# MariaDB at localhost:3306
docker compose exec api alembic upgrade head
docker compose exec api python -m app.jobs.seed_sources
docker compose exec api python -m app.jobs.collect --once
```

## Project layout

```
app/
  api/           # health, readiness, internal ops routers
  collectors/    # one module per approved source (pdrrmo)
  parsers/       # pure snapshot → records transforms
  services/      # freshness, snapshot storage, health
  models/        # ORM + enums
  jobs/          # collect, reparse, seed
migrations/
tests/
  fixtures/pdrrmo  # de-identified HTML snapshots
```

## Source acceptance (pdrrmo.bulacan.gov.ph)

Recorded in `source_registry` seed. Before enabling:

- canonical_url, publisher, terms, robots, cadence, timezone, maintainer
- written permission if terms unclear
- fixture + expected parsed result
- published timestamp vs fetch time separation
- freshness/retry policy, units, expected range, parser_version, alert contact
- second-person review before public exposure

## Freshness defaults (Phase A)

| Data type | warning | hide |
|---|---|---|
| Scheduled hydrology (15/30m) | 45m | 90m |
| Daily dam/rainfall table | 30h | 54h |
| Tide schedule | 36h | 72h |

API returns `observed_at`, `fetched_at`, `freshness_state`.

## Safety boundary

Public responses must never claim to be an official forecast, issue evacuations, or promise real-time rescue. Stale/missing data → `unknown`, never `normal`.

## Testing

```bash
pytest
pytest tests/unit/test_pdrrmo_parsers.py -v
ruff check .
mypy app
```

## Environment

See `.env.example` for all variables. Never commit `.env`.

Database snapshot safeguards default to 2 MB raw, 1 MB gzip, and 250 MB total tracked gzip data. Adjust them conservatively for the actual Hostinger quota. A limit breach fails before parsing; it does not discard prior snapshots or observations.

## License

MIT
