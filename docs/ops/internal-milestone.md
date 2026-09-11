# Internal deployable milestone

This runbook is the acceptance checklist for the safe Phase B milestone. It
does not authorize live collection or public exposure.

## Evidence sequence

1. Export a backup of the intended Hostinger database before any schema work.
2. Import or migrate through `005_phase_b_conditions`; confirm the revision in
   `bantay_baha/scripts/mariadb_verify.sql`.
3. Run `python -m app.jobs.seed_sources`. Confirm both `pdrrmo` and
   `pagasa_flood` have `enabled=0`, no real approval timestamp, and no named
   production reviewer.
4. Run fixture-only collection for both sources. Repeat each fixture to prove
   idempotent observations and snapshot retention.
5. Run `python -m app.jobs.backup_restore backup --output ... --manifest ...`.
   Restore only into a disposable database with explicit overwrite permission,
   then rerun the verification SQL and compare counts, gzip bytes, and hashes.
6. Verify `GET /health`, `GET /readiness`, authenticated ops routes, the
   configured CORS origin, and snapshot quota behavior.
7. Export synthetic CSV evidence with
   `python -m app.jobs.synthetic_situation_report --output ...`.

## Stop conditions

Stop and investigate if a fixture tries live HTTP, either source becomes
enabled, a mapping is enabled, a public route appears, a snapshot body is
missing, or the restore comparison differs.

## Not in this milestone

No PAGASA cron, live PAGASA fetch, production mapping, public API/dashboard,
stored PAGASA publication, or official-partner language is permitted. Human
approval fields remain pending until a person records the decision and case
number.
