# Bantay Baha — Scheduler Deployment (Phase A)

> Implements audit gap: "Add an actual external schedule or a documented scheduler deployment."

## Overview

- **Cadence:** 30 minutes default (`PDRRMO_CADENCE_MINUTES=30` in `bantay_baha/app/config.py:28`). 15m only if source safely supports it; otherwise 30m. Configurable per source via `source_registry.cadence_minutes`, not hard-coded to rainy season.
- **Dry season:** Preserve at least daily health check if service enabled (`docs/plans/bantay-baha-python-automation.md:124`).
- **Contract:** Every scheduled run is `fetch → snapshot (before parse) → parse → store`, idempotent, auditable via `source_snapshot` + `audit_log`. Failed run never deletes last known good value.

## Options (pick one owner)

| Platform | Config | Invocation |
|---|---|---|
| **Hostinger Cron (production owner)** | hPanel Cron invokes the deployed Node service every 30 minutes using the authenticated ops endpoint described in `docs/plans/hostinger-node-bantay-baha-deployment.md` Phase 6. | Keep the token in an HTTP header through a private wrapper; do not put it in the URL or Cron output. The service enforces database-backed cadence/overlap protection. |
| **GitHub Actions (manual diagnostics only)** | `.github/workflows/bantay-baha-collect.yml` — `workflow_dispatch`; no recurring schedule | Runs the Python collector only when an operator explicitly dispatches it and has configured a reachable durable MariaDB secret. Do not enable this schedule alongside Hostinger Cron. |
| **Render Cron** | Render dashboard → Cron Job → `python -m app.jobs.collect --once` every 30m | Same env vars; the Hostinger database must permit the job host's remote connection. |
| **Cloud Scheduler (GCP)** / **EventBridge (AWS)** | HTTP target `POST https://api.bettermalolos.org/v1/ops/collect?source=pdrrmo` with `Authorization: Bearer $OPS_API_TOKEN` | Web handler triggers `collect_pdrrmo()`; respects internal rate limit and `terms_reviewed_at` gate. |

All options respect per-source rate limiting (`bantay_baha/app/collectors/pdrrmo.py:366` checks `elapsed < cadence`) and conditional requests (`If-None-Match`/`If-Modified-Since` via `source_registry.last_etag`).

## Verification

- CI dry-run: `.github/workflows/bantay-baha-ci.yml:66` `python -m app.jobs.collect --fixture tests/fixtures/pdrrmo/sample_2026-09-02.html --once`
- Manual trigger: `POST /v1/ops/collect` (requires `OPS_API_TOKEN`) returns `counts`, `errors`, `warnings`.
- Post-deploy: `GET /v1/ops/health/sources` shows `last_snapshot.fetched_at`, `freshness`, and thresholds `45m/90m` (hydrology), `30h/54h` (dam/rainfall), `36h/72h` (tide). **Durability required**: the schedule accepts only a persistent MariaDB/MySQL PyMySQL URL and stores gzip snapshot bodies in the same database. It has no ephemeral database/filesystem fallback.
- The scheduler verifies revision `004_mariadb_snapshots` and performs no schema DDL. Import `bantay_baha/scripts/mariadb_schema.sql` with phpMyAdmin (or run Alembic once) before enabling it.
- TODO — Alert delivery not yet implemented: repeated source failures, parser drift, and 90-minute critical-feed staleness must still be monitored manually via `GET /v1/ops/health/sources` freshness. Do not claim automated email to `ops@bettermalolos.org` until alert transport is implemented and tested.

## Exit Criterion

Scheduled, idempotent run stores raw snapshot + valid parsed measurements; changed page fails visibly without corrupting prior values (atomic failure per `REQUIRED_TABLES`).
