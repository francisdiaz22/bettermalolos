# Bantay Baha on Hostinger Unlimited — Node.js Deployment Plan

## Decision and target architecture

Deploy Bantay Baha as a **separate Node.js Web App** on the existing Hostinger
Unlimited plan. Keep the BetterMalolos website as a static site. Do not deploy
the existing Python/FastAPI directory to `public_html`: Hostinger Web Hosting
does not run Python server applications, and static deployment would expose
source files without starting the API.

```text
browser ── HTTPS ──> bettermalolos.org        (existing static website)
                         │
                         └── HTTPS ──> api.bettermalolos.org  (Hostinger Node app)
                                                   │
                                                   └── localhost:3306
                                                           Hostinger MariaDB

Hostinger Cron ── HTTPS + bearer token ──> POST /v1/ops/collect
```

The API app owns all database access. MySQL Remote Access remains disabled;
the Node app uses `localhost`, so port 3306 is not exposed to the internet.

## Scope and non-goals

This is a runtime port of the Phase A service, not a feature expansion.

In scope:

- Port the existing internal API, collector, parser, validation, snapshot
  storage, freshness calculation, and source-approval gate from Python to
  Node.js.
- Reuse the existing MariaDB schema and raw snapshot/audit design.
- Add a deployment-ready Node.js package and Hostinger configuration.
- Run collection by Hostinger Cron through an authenticated API endpoint.

Out of scope for the first deployment:

- Publishing flood information to the public website.
- Enabling collection before source approval is recorded in the database.
- Automated alerts, public forecasts, or emergency instructions.
- Docker, VPS, GitHub Actions database access, or Remote MySQL access.

## Phase 0 — protect the database and repository

1. Keep the Hostinger **Remote MySQL** list empty. Do not recreate the `Any
   Host` entry.
2. Keep the newly rotated password only in Hostinger environment variables and
   in a local, ignored development `.env`. Never commit it.
3. Replace the current local `bantay_baha/.env` value before using it again:
   it contains a revoked password. Prefer a harmless placeholder locally until
   the new password is configured by the operator.
4. Confirm `bantay_baha/.env` is ignored with `git check-ignore
   bantay_baha/.env`; it must never appear in `git status`.
5. Add `bantay_baha/` to the exclusions in `build.sh` and
   `scripts/copy-dist.js`. This prevents Python source, fixtures, SQL, and
   internal docs from being copied into the static `dist/` upload.
6. Do not commit unrelated existing deletions or modifications. Before
   committing, review `git status` and stage only the files belonging to this
   work.

Exit gate: static-site builds contain no `dist/bantay_baha/`, no `.env`, and no
database password is in Git history.

## Phase 1 — create the Node service

Create a new package at `bantay_baha_node/` rather than replacing the Python
prototype during the first port. The Python implementation remains the
behavioral reference until the Node service passes equivalent fixture tests.

Recommended stack:

| Concern | Choice |
| --- | --- |
| HTTP server | Fastify |
| MySQL/MariaDB driver | `mysql2/promise` pool |
| Input/schema validation | Zod or Fastify JSON Schema |
| HTML parsing | Cheerio |
| HTTP client | Node built-in `fetch`/Undici |
| Compression | Node built-in `zlib.gzip` |
| IDs and hashing | `crypto.randomUUID`, `crypto.createHash` |
| Tests | Node test runner or Vitest |

Initial directory layout:

```text
bantay_baha_node/
  package.json
  package-lock.json
  src/
    server.js                 # Fastify setup and process startup
    config.js                 # validated environment variables
    db.js                     # one mysql2 connection pool
    routes/health.js
    routes/ops.js
    services/collector.js
    services/snapshot-store.js
    services/freshness.js
    services/source-registry.js
    parsers/pdrrmo.js
    jobs/seed-sources.js
  test/
    fixtures/                 # copy existing de-identified HTML fixtures
    parsers/pdrrmo.test.js
    api/health.test.js
  .env.example
  .gitignore
```

The Node app must listen on `process.env.PORT || 3000`; Hostinger manages the
public listener and expects a Node application to expose its service port.

## Phase 2 — port behavior without changing the data contract

Port in this order, with fixture tests after each item:

1. **Configuration and database pool**
   - Read `DATABASE_URL`, `APP_ENV`, `OPS_API_TOKEN`, `CORS_ALLOW_ORIGINS`,
     snapshot limits, PDRRMO URL, cadence, and timeout/retry settings.
   - Reject startup in production when `OPS_API_TOKEN` is absent.
   - Use one reusable `mysql2` pool with connection limits below Hostinger's
     75-per-user cap; start with `connectionLimit: 5`.
   - Do not put credentials in source, logs, responses, or test snapshots.

2. **Schema-compatible persistence**
   - Reuse the exact table names and columns in
     `bantay_baha/scripts/mariadb_schema.sql`.
   - Store timestamps as UTC `DATETIME(6)` values.
   - Generate UUID text IDs, preserve foreign keys, `active_key` uniqueness,
     idempotent inserts, correction-as-new-version behavior, and audit rows.
   - Store compressed raw response bodies in `source_snapshot.raw_body_gzip`.
   - Enforce raw-body, gzip-body, and total database snapshot quotas before
     parsing; never delete older snapshots to make room.

3. **PDRRMO parser and collector**
   - Port the parser exactly from `bantay_baha/app/parsers/pdrrmo.py`.
   - Copy the existing fixtures and expected JSON results, then make the Node
     tests assert the same normalized observations, thresholds, warnings, and
     parse failures.
   - Retain conditional HTTP requests (`ETag` / `Last-Modified`), 30-minute
     cadence checks, retry/timeout behavior, and snapshot-before-parse order.
   - On HTTP, parser, or persistence failures, preserve the error snapshot and
     prior valid observations; return a failing status to Cron.

4. **Source registry and approval gate**
   - Implement idempotent seeding for `pdrrmo` with `enabled = false`.
   - Do not use environment variables to override approval.
   - Live collection may run only when a named second reviewer, terms review,
     approval timestamp, licensing notes, and robots review are recorded in
     `source_registry`.

5. **Internal API parity**
   - `GET /health`: liveness only, no secrets.
   - `GET /readiness`: database, snapshot quota, and schema checks; return
     HTTP 503 when a required check fails.
   - `GET /v1/ops/health/sources`
   - `GET /v1/ops/snapshots`
   - `GET /v1/ops/observations`
   - `POST /v1/ops/collect?source=pdrrmo`
   - Require `Authorization: Bearer <OPS_API_TOKEN>` or `X-Ops-Token` for all
     `/v1/ops/*` routes, including collection. Use constant-time comparison.
   - Keep CORS restricted to `https://bettermalolos.org`; do not use `*`.

Exit gate: fixture parser outputs and API response shapes match the Python
reference, and a local disposable MariaDB test creates snapshot, station,
observation, and audit records without duplicate active observations.

## Phase 3 — prepare the repository for deployment

1. Add `package.json` scripts:

```json
{
  "scripts": {
    "start": "node src/server.js",
    "test": "node --test",
    "lint": "eslint ."
  },
  "engines": { "node": ">=20 <25" }
}
```

2. Add `bantay_baha_node/.env.example` containing only placeholders:

```dotenv
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://DB_USER:ENCODED_PASSWORD@localhost:3306/DB_NAME
OPS_API_TOKEN=replace-with-a-long-random-secret
CORS_ALLOW_ORIGINS=https://bettermalolos.org
PDRRMO_ENABLED=false
PDRRMO_CADENCE_MINUTES=30
SNAPSHOT_MAX_RAW_BYTES=2000000
SNAPSHOT_MAX_COMPRESSED_BYTES=1000000
SNAPSHOT_DATABASE_QUOTA_BYTES=250000000
```

3. Do not upload or commit `bantay_baha_node/.env`. Add it to the new package's
   `.gitignore` and the root `.gitignore` if not already covered.
4. Add CI that runs Node tests and does not require Hostinger credentials.
5. Verify `npm ci`, `npm test`, and a local `GET /health` before committing.

Suggested commits:

1. `chore: exclude backend services from static site builds`
2. `feat: add bantay baha node service and parser tests`
3. `docs: add hostinger node deployment runbook`

Exit gate: a fresh checkout can run `npm ci && npm test` inside
`bantay_baha_node/`; `npm run build` for the static site contains no backend
directory.

## Phase 4 — provision Hostinger without opening MySQL remotely

1. In hPanel, use **Websites → Add Website → Deploy Web App**.
2. Create a separate Node.js application from the Git repository. Set its root
   directory to `bantay_baha_node` (not the repository root).
3. Assign a dedicated subdomain, for example `api.bettermalolos.org`. Do not
   place the Node service under the static site's `public_html` folder.
4. Let Hostinger install dependencies from the committed lockfile and run the
   `start` script. Use Node 20, 22, or 24, subject to Hostinger's available
   runtime selector.
5. In the Web App deployment's **Environment variables** screen, add the
   production values manually:

```dotenv
NODE_ENV=production
DATABASE_URL=mysql://u735413447_admin:URL_ENCODED_ROTATED_PASSWORD@localhost:3306/u735413447_bettermalolos
OPS_API_TOKEN=LONG_RANDOM_VALUE_NOT_SHARED_OR_COMMITTED
CORS_ALLOW_ORIGINS=https://bettermalolos.org
PDRRMO_ENABLED=false
PDRRMO_CADENCE_MINUTES=30
SNAPSHOT_MAX_RAW_BYTES=2000000
SNAPSHOT_MAX_COMPRESSED_BYTES=1000000
SNAPSHOT_DATABASE_QUOTA_BYTES=250000000
```

`DATABASE_URL` is one variable: the password and hostname are embedded in the
connection string. URL-encode reserved password characters such as `@`, `:`,
`/`, `?`, `#`, `%`, and `$`. Do not paste the value into source control.

6. Deploy, then inspect Hostinger's build/runtime logs. A correct initial
deployment returns HTTP 200 from `/health`; `/readiness` is expected to return
HTTP 503 until the schema is imported.

## Phase 5 — initialize and verify MariaDB

1. Before importing, confirm in phpMyAdmin that
   `u735413447_bettermalolos` has no Bantay Baha tables.
2. Import `bantay_baha/scripts/mariadb_schema.sql` through phpMyAdmin. This
   script is for an empty database and is not an overwrite/upgrade script.
3. Run `bantay_baha/scripts/mariadb_verify.sql` in phpMyAdmin.
4. Trigger the Node equivalent of `seed-sources` once. Verify that `pdrrmo`
   is present and remains `enabled = 0` with approval fields pending.
5. Call `GET /readiness`; expect database, migration/schema, and snapshot
   storage checks to report `ok`.
6. Run exactly one fixture collection while live retrieval is still disabled.
   Confirm one gzip snapshot, station rows, parsed observations, and audit
   records in phpMyAdmin.
7. Run the fixture a second time and verify idempotence: no duplicate active
   observation is created.

Exit gate: `mariadb_verify.sql` passes and the Node app connects via
`localhost`; Hostinger Remote MySQL remains disabled.

## Phase 6 — schedule collection safely

1. Create a narrow Cron-only route or reuse `POST /v1/ops/collect` with an
   `OPS_API_TOKEN` bearer token. It must reject a missing or invalid token.
2. In hPanel **Cron Jobs**, schedule a command every 30 minutes that makes an
   HTTPS request to the API. Keep the token out of the URL and out of Cron
   output; send it in an HTTP header through a small private shell wrapper if
   Hostinger Cron supports it. If hPanel cannot securely send a header, use a
   dedicated long random Cron secret in a header-compatible wrapper or build a
   server-side Node schedule with an overlap lock.
3. Enforce a database-backed overlap/cadence lock so a slow run cannot overlap
   the next run.
4. Treat a non-200 collector result as a failed Cron run. Do not append a
   command that hides errors.
5. At first, leave live collection disabled. Complete source acceptance first:
   verify terms/permission and robots, record the review timestamp and named
   second reviewer, then explicitly set `enabled = 1`.
6. After approval, perform one manual authenticated collection before enabling
   the recurring Cron schedule.

## Phase 7 — release and operations checks

Before connecting any public webpage:

- [ ] `https://api.bettermalolos.org/health` returns 200.
- [ ] `/readiness` returns 200 after schema import.
- [ ] `/v1/ops/*` returns 401 without a token and 200 with a valid token.
- [ ] CORS allows only the intended BetterMalolos origin.
- [ ] The MySQL user connects through `localhost`; Remote MySQL is still empty.
- [ ] Schema verification reports `004_mariadb_snapshots`.
- [ ] A fixture collection is stored and idempotent.
- [ ] A live collection has written approval evidence and has been manually
      checked for reasonable results.
- [ ] Cron runs once without overlap and records failures visibly.
- [ ] The public site labels any future data as community decision support, not
      an official forecast or emergency instruction.

Monitor:

- Hostinger Node app build/runtime logs after every deployment.
- Cron job output and failed executions.
- `/v1/ops/health/sources` freshness and last snapshot time.
- Database size against the configured snapshot quota (the plan allows 3 GB per
  database; reserve space for indexes, observations, and backups).

## Rollback plan

1. If the Node deployment fails, disconnect the API subdomain or stop the Web
   App; the static BetterMalolos site remains unaffected.
2. If collection misbehaves, disable the Cron job first, then set
   `source_registry.enabled = 0`. Do not delete snapshots or observations.
3. If a schema import fails, restore the database backup or drop only the
   explicitly identified empty Bantay Baha tables through phpMyAdmin after
   confirming the target. Never drop the entire shared database blindly.
4. Never reopen Remote MySQL as a rollback step. Node Web App → `localhost`
   remains the intended connection path.

## Operator checklist for hPanel

- [ ] Remote MySQL: no `Any Host` rule.
- [ ] Add Website → Deploy Web App → Node.js application.
- [ ] Repository root: `bantay_baha_node`.
- [ ] Subdomain: `api.bettermalolos.org`.
- [ ] Environment variables added in hPanel, including the rotated password.
- [ ] MySQL hostname: `localhost`.
- [ ] Schema imported and verified in phpMyAdmin.
- [ ] Application started and `/health` checked.
- [ ] Source seeded but disabled.
- [ ] Source acceptance completed before `enabled = 1`.
- [ ] Cron configured only after the authenticated manual run succeeds.

