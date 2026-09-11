# Bantay Baha — Scheduler Deployment (Phase B internal)

> Implements audit gap: "Add an actual external schedule or a documented scheduler deployment."

## Overview

- **Cadence:** PDRRMO and PAGASA default to 30 minutes in configuration, but the approved cadence must be recorded separately for each source before enablement. Use 15 minutes only if the accepted source policy safely supports it. Runtime cadence comes from `source_registry.cadence_minutes`.
- **Dry season:** Preserve at least daily health check if service enabled (`docs/plans/bantay-baha-python-automation.md:124`).
- **Contract:** Every scheduled run is `fetch → snapshot (before parse) → parse → store`, idempotent, auditable via `source_snapshot` + `audit_log`. Failed run never deletes last known good value.

## Options (pick one owner)

| Platform | Config | Invocation |
|---|---|---|
| **Hostinger Cron (production owner)** | hPanel Cron invokes the deployed Node service every 30 minutes using the authenticated ops endpoint described in `docs/plans/hostinger-node-bantay-baha-deployment.md` Phase 6. | Keep the token in an HTTP header through a private wrapper; do not put it in the URL or Cron output. The service enforces database-backed cadence/overlap protection. |
| **GitHub Actions (manual diagnostics only)** | `.github/workflows/bantay-baha-collect.yml` — `workflow_dispatch`; no recurring schedule | Runs the Python collector only when an operator explicitly dispatches it and has configured a reachable durable MariaDB secret. Do not enable this schedule alongside Hostinger Cron. |
| **Render Cron** | Render dashboard → Cron Job → `python -m app.jobs.collect --once` every 30m | Same env vars; the Hostinger database must permit the job host's remote connection. |
| **Cloud Scheduler (GCP)** / **EventBridge (AWS)** | HTTP target `POST https://api.bettermalolos.org/v1/ops/collect?source=pagasa_flood` with `Authorization: Bearer $OPS_API_TOKEN` after PAGASA approval | The source-specific call avoids coupling availability to disabled PDRRMO. `source=all` is useful for an operator diagnostic because it attempts both collectors and returns each outcome independently. |

Both collectors enforce their own database-backed cadence and conditional request state (`last_etag` / `last_modified`). A source must pass its own terms, approval, reviewer, and enabled gates before a live fetch. PDRRMO remains disabled while unavailable; schedule PAGASA directly once its separate acceptance is complete.

## Current deployment boundary

No recurring scheduler is authorized yet. The source registry entries remain
disabled, and the milestone is fixture-only. Do not schedule a PAGASA cron job
or use a live collection endpoint until the source-use response, cadence,
freshness thresholds, named reviewers, and deployment roles are recorded in
[`docs/review/approval-register.md`](../review/approval-register.md).

## Verification

- PDRRMO fixture: `python -m app.jobs.collect --source pdrrmo --fixture tests/fixtures/pdrrmo/sample_2026-09-02.html --once`
- PAGASA fixture: `python -m app.jobs.collect --source pagasa_flood --fixture tests/fixtures/pagasa/sample_flood.html --once`
- Manual trigger: `POST /v1/ops/collect?source=pagasa_flood` (requires `OPS_API_TOKEN`) returns `counts`, `errors`, and `warnings`. `source=all` returns a keyed result for every collector.
- Post-deploy: `GET /v1/ops/health/sources` shows `last_snapshot.fetched_at`, `freshness`, and thresholds `45m/90m` (hydrology), `30h/54h` (dam/rainfall), `36h/72h` (tide). **Durability required**: the schedule accepts only a persistent MariaDB/MySQL PyMySQL URL and stores gzip snapshot bodies in the same database. It has no ephemeral database/filesystem fallback.
- Internal prototype: `GET /v1/ops/dashboard` is authenticated and non-public; it reports `unknown`, `stale`, `unavailable`, `source_failure`, and `available` states from internal metadata only.
- Backup/restore: use `python -m app.jobs.backup_restore` and retain a non-secret manifest plus disposable restore comparison.
- Fixture acceptance: use `python -m app.jobs.verify_internal_milestone` before any deployment handoff.
- The scheduler verifies revision `005_phase_b_conditions` and performs no schema DDL. Import `bantay_baha/scripts/mariadb_schema.sql` into a new database, or run Alembic once against an existing revision-004 schema, before enabling it.
- TODO — Alert delivery not yet implemented: repeated source failures, parser drift, and 90-minute critical-feed staleness must still be monitored manually via `GET /v1/ops/health/sources` freshness. Do not claim automated email to `ops@bettermalolos.org` until alert transport is implemented and tested.

## Exit Criterion

An approved source-specific scheduled run stores a raw snapshot plus valid parsed measurements; a changed page fails visibly without corrupting prior values. PDRRMO being disabled does not prevent an independently scheduled PAGASA run.
