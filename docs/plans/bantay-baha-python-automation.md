# Bantay Baha — Python Automation Implementation Specification

> Implementation brief for a development agent. This document describes a **decision-support and information service**, not an official forecasting or emergency-dispatch system.

## Outcome and non-negotiable safety boundary

Build a separately deployable Python service that collects published hydrology and official-advisory data, accepts carefully moderated resident flood reports, and exposes safe, sourced summaries for a future BetterMalolos Bantay Baha dashboard.

The public experience may show observed conditions, the exact wording of active official advisories, source links, and a clearly labelled community risk indicator. It must **not** claim to be an official forecast, replace PAGASA/PDRRMO/CDRRMO instructions, issue evacuation orders, or promise real-time emergency response. During an emergency, it must direct residents to official channels and local emergency contacts.

The current BetterMalolos repository is a static HTML/CSS/JavaScript site. Keep the Python application in a top-level `bantay_baha/` directory (or a separate repository if deployment ownership requires it); do not put server credentials, ingestion code, or moderation logic in public client JavaScript. The static site consumes a versioned, read-only public API only after the service has passed its launch gate.

## Confirmed source inventory

As verified on 2 September 2026, the [Bulacan PDRRMO hydrological page](https://pdrrmo.bulacan.gov.ph/) publishes tide-schedule entries, dam levels, observed rainfall including **Barangay Look 1st**, flooding-situation status, and river-station actual/alert/alarm/critical levels. The [PAGASA flood page](https://www.pagasa.dost.gov.ph/flood) publishes basin flood status, including Pampanga and Angat sub-basin, and dam water-level updates. [PAGASA's flood-warning legend](https://www.pagasa.dost.gov.ph/learnings/legend) is the authority for any public warning-level explanation. [Malolos CDRRMO planning materials](https://maloloscity.gov.ph/cdrrmo-plan/) are the candidate source for hazard layers and contingency context.

FloodCaster is a useful research input, but the current public application must be manually assessed for an approved, stable, machine-readable access method before it is collected. Do not scrape protected, authenticated, rate-limited, or terms-restricted sources. Prefer a documented API, official downloadable artifact, or written permission.

### Source acceptance checklist

Complete this for every source before enabling its collector:

- [ ] Record the canonical URL, publisher, licensing/terms, robots rules, expected update frequency, timezone, and responsible maintainer in `source_registry`.
- [ ] Complete a source-use review covering published terms/notices, robots rules, attribution, fetch rate, and contact details. A public page does not by itself settle automated-reuse conditions, but written PDRRMO permission is required only if published conditions are unclear/restrictive or BetterMalolos will claim an official partnership.
- [ ] Save a representative source snapshot and an expected parsed result as a fixture.
- [ ] Identify the source's published timestamp separately from the fetch time.
- [ ] Define freshness and retry policy, normal units, expected range, parser version, and source-specific alert contact.
- [ ] Have a second person from the BetterMalolos project/organization review the source-to-field mapping before a field is public. This is an internal quality-control reviewer, not a PDRRMO official. If the project currently has only one maintainer, collection may remain internal while public publication waits for a second reviewer.

Do not treat a provincial station as a measurement for every Malolos barangay. Store and display its station identity, location, observed time, and geographic limitation.

## Required decisions before development

Do not open resident reporting or a public risk label until these owners and policies are confirmed:

- [ ] Product owner and incident commander: who can disable public reporting, suppress a faulty source, and approve an emergency banner.
- [ ] Official coordination: whether PDRRMO/CDRRMO/PAGASA will be linked only, notified, or formally partnered with; this project has no authority to relay operational warnings without agreement.
- [ ] Data-processing owner, privacy notice, lawful handling basis, retention schedule, deletion/export contact, and a Philippines Data Privacy Act review.
- [ ] Deployment owner, budget, database/backups, secret management, monitoring destination, and on-call escalation path.
- [ ] Official barangay boundary/hazard-layer files and their licence, provenance, scale, version, and last-reviewed date.
- [ ] Moderation staffing, coverage hours, target review SLA, and rule for reports outside staffed hours.
- [ ] Whether photos are allowed. Default MVP: **no photos** until private object storage, malware scanning, metadata stripping, human review, abuse handling, and retention/deletion are approved.

If any item is unresolved, build and test the internal pipeline with synthetic reports only. The public site remains a proposed-tool page, as represented by `data/community-tools.json`.

## Architecture

```text
Official pages/files ──> collectors ──> immutable compressed raw snapshots ──> parsers ──> MariaDB
                                                                    │             │
Resident report form ──> API validation ──> moderation queue ──────┘             │
                                                                                  v
                                                            scoring + publishing policy
                                                                                  │
                                              internal operations API/dashboard    ├──> audit log
                                                                                  │
                                              public read-only API ───────────────┴──> BetterMalolos UI
```

Use a single Python service initially:

- Python 3.12+, FastAPI, Pydantic v2, SQLAlchemy/Alembic, Hostinger MariaDB/MySQL, and `httpx`/BeautifulSoup or `lxml`.
- An external scheduler (GitHub Actions, Render cron, Cloud Scheduler, or equivalent) invokes a command/worker endpoint; web request handling must not run collection inline.
- For the zero-new-cost, text-only MVP, the existing Hostinger MariaDB database stores parsed records, snapshot metadata, and gzip-compressed raw response bodies in an append-only snapshot table. Enforce a compressed-size limit, content hash, retention policy, database quota monitoring, and periodic export/restore testing. S3-compatible storage is a later scaling option, not a Phase A dependency.
- Photos and other resident uploads remain prohibited while private object storage, malware scanning, metadata stripping, moderation, and deletion controls are unavailable.
- A queue is optional for MVP. Add one only when parsing, images, notification volume, or retries require asynchronous workers.
- Deploy timezone-aware; persist all timestamps as UTC and render `Asia/Manila` in APIs/UI. Never infer a source timestamp from the server clock.

### Suggested repository layout

```text
bantay_baha/
├── app/
│   ├── api/                 # public and authenticated routers
│   ├── collectors/          # one module per approved source
│   ├── parsers/             # pure snapshot-to-record transforms
│   ├── services/            # freshness, moderation, scoring, publication
│   ├── models/              # ORM and Pydantic contracts
│   ├── jobs/                # collect, reparse, expire, publish, report
│   └── templates/           # internal situation-report templates
├── migrations/
├── tests/
│   ├── fixtures/            # de-identified HTML/PDF/JSON source snapshots
│   ├── unit/
│   ├── integration/
│   └── contract/
├── scripts/
├── pyproject.toml
├── Dockerfile
└── README.md
```

No production response, personal report, secret, or unredacted source snapshot belongs in Git.

## Data model and audit rules

All tables include `id`, `created_at`, and `updated_at` as applicable. Retain `source_url`, `source_published_at`, `fetched_at`, `parser_version`, `snapshot_id`, and `quality_state` on every imported measurement. Use `Decimal` for measured values rather than binary float.

| Entity              | Required fields                                                                                         | Rules                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `source_registry`   | name, canonical_url, type, enabled, cadence_minutes, timezone, terms_reviewed_at                        | One owner and source-specific freshness threshold required.                                                         |
| `source_snapshot`   | source_id, fetched_at, HTTP status, content hash, object key, content type, parser version              | Append-only; deduplicate exact content hashes only when audit links remain intact.                                  |
| `station`           | source_id, source_station_id, name, kind, latitude/longitude when authoritative, units                  | Never fabricate coordinates or claim a station covers a barangay.                                                   |
| `observation`       | station_id, metric, value, unit, observed_at, thresholds, snapshot_id, quality state                    | Unique on station, metric, observed time, source. Corrections create a superseding record; never overwrite history. |
| `official_advisory` | source, source URL, issued/expires/review times, raw text, level, areas, structured fields, snapshot ID | Preserve original text and clearly mark extraction confidence.                                                      |
| `barangay_context`  | official barangay ID/name, hazard classification, geometry/layer version, reviewed date                 | Hazard context is static/planning context, not live flood confirmation.                                             |
| `resident_report`   | private fields, public-safe fields, geometry precision, status, expiry/reconfirmed timestamps           | Split private contact from public projection. Default status is `pending`.                                          |
| `report_cluster`    | spatial/time window, severity, linked reports, credibility signals                                      | A cluster is not a verified flood event until moderation policy says so.                                            |
| `risk_assessment`   | barangay, inputs/version, score, display state, computed/published times                                | Immutable calculation input/output record; publication can be withdrawn.                                            |
| `moderation_action` | actor/service, action, reason, before/after state, timestamp                                            | Append-only; required for every staff decision.                                                                     |

### Core enums

- Observation quality: `valid`, `missing`, `stale`, `out_of_range`, `parse_error`, `superseded`.
- Report status: `pending`, `needs_review`, `verified`, `rejected`, `expired`, `redacted`.
- Publication state: `internal_only`, `public`, `suppressed`.
- BetterMalolos indicator: `normal`, `monitor`, `alert`, `critical`, `unknown`.

`unknown` is required whenever critical inputs are stale, missing, or parser health is failing. Do not degrade missing data to `normal`.

## Collection and ETL

### Cadence

Schedule 15-minute collection only for sources that safely support it and have material updates at that cadence. Otherwise use 30 minutes. During dry season, preserve at least a daily health check if the service is enabled. Keep collection schedules configurable per source, not hard-coded to a rainy-season date.

### Collector contract

Each collector must:

1. Fetch with an identifying User-Agent, connect/read timeout, conditional request headers where supported, bounded retries with jitter, and source-specific rate limits.
2. Persist the raw body and response metadata **before** parsing.
3. Parse only from the persisted snapshot, producing typed records plus warnings.
4. Validate units, timestamps, finite values, known station names, and plausible ranges.
5. Upsert exact duplicate observations idempotently; write changed/corrected values as new versions.
6. Emit structured logs, metrics, and a success/failure run record. A failed run never deletes the last known good value.

Define initially conservative plausibility checks. For example, reject negative rainfall and impossible negative dam levels; flag large rate-of-change values for review rather than silently discarding a genuine extreme event. Threshold comparisons always use source-published threshold values from the same snapshot.

### Parsers

- Give every parser a fixture from a saved source response and contract tests for expected fields.
- Make headings/table-column matching resilient to whitespace, unit punctuation, and benign markup changes; fail closed if required labels disappear.
- Store source wording and unit alongside normalized values. Conversion is explicit and tested.
- Page redesign, missing cells, changed date format, or unknown station must produce `parse_error`/`needs_review`, not guessed output.
- Maintain a `parser_version` and reparse capability so historical snapshots can be recovered after a parser fix.

### Freshness policy

Report freshness separately from source timestamp. Initial defaults, to be approved per source:

| Data type                          |            Warning stale after |     Hide/mark unavailable after |
| ---------------------------------- | -----------------------------: | ------------------------------: |
| Scheduled hydrology collection     |                     45 minutes |                      90 minutes |
| Published daily dam/rainfall table |                       30 hours |                        54 hours |
| Tide schedule                      |                       36 hours |                        72 hours |
| Official advisory                  |      Source expiry/review time |        Immediately after expiry |
| Resident report                    | 2 hours without reconfirmation | 6 hours unless reviewer extends |

The API must return `observed_at`, `fetched_at`, and `freshness_state`; the UI must render at least observed/source time and freshness. A stale official advisory is never shown as active.

## Official-advisory extraction

Use a deterministic extraction pipeline before NLP:

1. Identify publication type and publisher from a source allowlist.
2. Save the exact original notice and source URL.
3. Extract issued time, valid-until/review time, named locations, warning label, recommended action, and the quoted relevant excerpt.
4. Normalize location names only against a reviewed barangay/road gazetteer; retain unmatched text for a reviewer.
5. Assign extraction confidence. Any missing issue time, unclear geography, non-allowlisted publisher, or low confidence remains internal pending review.

Never paraphrase emergency action as new guidance. The public API returns the official wording/excerpt, issuer, time, link, and a label such as “Official advisory — read the source.” The BetterMalolos indicator remains visually and semantically separate.

## Flood-risk scoring and publication policy

The first scoring engine is transparent, deterministic, versioned, and advisory only. It is **not** a hydrological forecast or official warning system.

### Inputs

- Recent rainfall from a named, appropriately located official station.
- Relevant river condition using the source's alert/alarm/critical thresholds.
- Tide proximity/height only where there is a documented geographic relationship.
- Active, source-linked PAGASA/PDRRMO/CDRRMO advisory affecting Malolos, Bulacan, Pampanga basin, Angat sub-basin, or named local areas.
- Verified resident-report clusters.
- Reviewed hazard classification as a bounded context modifier.

Absent evidence contributes zero points; it never proves safety. Any insufficient core input makes the result `unknown` or requires an explicit “limited data” label.

### Initial rules (configuration, not code constants)

| Signal                                           |      Suggested contribution |
| ------------------------------------------------ | --------------------------: |
| Meaningful recent rainfall at a named station    |                         1–2 |
| River at alert/alarm/critical                    |                   2 / 4 / 6 |
| Documented elevated tide condition               |                           1 |
| Active official advisory relevant to area        |                           5 |
| Each independently verified local report cluster |              2, capped at 4 |
| High hazard context                              | 1, capped total score at 10 |

Suggested display mapping: `0–1 normal`, `2–3 monitor`, `4–6 alert`, `7–10 critical`. However, `critical` requires either an active relevant official warning plus corroborating local condition, or explicitly confirmed local flooding under the approved policy. Store `ruleset_version`, all inputs, raw score, overrides, and published decision. A staff override requires a reason and expiry/review time.

Public copy must say: “Community indicator based on published observations and reviewed reports. It is not an official flood forecast. Check official advisories and emergency contacts.” It must never say “safe,” “no flood,” “evacuate,” or “all clear.”

## Resident reporting and moderation

### MVP form

Accept only:

- barangay (reviewed controlled list);
- optional nearby landmark/general location, with an instruction not to submit a house number or personal address;
- flood-depth category (`none`, `ankle`, `knee`, `waist`, `above_waist`, `unknown`), never free-text centimetres initially;
- road passability (`unknown`, `passable`, `passable_with_caution`, `not_passable`);
- occurred-at timestamp; and
- optional contact, stored privately and never returned by a public endpoint.

Show the emergency notice before form submission: this is not monitored for rescue requests; call official emergency services for immediate help. Rate-limit by privacy-preserving security controls, add bot protection, cap text lengths, reject HTML, and require server-side validation.

### Privacy and publication rules

- Do not collect name, phone, email, precise home location, or photo by default.
- If a contact method is approved, encrypt/protect it, restrict it to moderators, exclude it from logs/analytics/exports, and delete it by retention policy.
- Convert public locations to barangay or coarse grid/landmark precision. Strip EXIF and scan media before any staff view if photos are later approved.
- A public report never reveals submitter identity, contact, source IP, exact coordinates, or unreviewed free text.
- Provide abuse reporting, deletion requests, and a documented redaction process.

### Moderation flow

```text
submission → validation/spam checks → pending → duplicate/cluster check
                                      ├─ clear & corroborated → needs_review → verified → public aggregate
                                      └─ unclear/conflicting → needs_review → rejected/redacted/expired
```

Duplicate detection uses a configurable short time window and coarse spatial/barangay match, plus category/passability similarity. It links reports; it does not delete them. Credibility is a review aid based on consistency, independent corroboration, freshness, and source evidence—not a judgement about a resident. Automatic publication is prohibited for individual reports. Expire reports by policy unless reconfirmed or extended by a moderator.

## APIs

Serve public API endpoints from a distinct domain/subdomain with strict CORS to `https://bettermalolos.org` and approved preview origins. Public responses include no private report fields and have cache headers appropriate to freshness.

| Endpoint                        | Audience            | Purpose                                                                              |
| ------------------------------- | ------------------- | ------------------------------------------------------------------------------------ |
| `GET /v1/public/status`         | public              | city-wide indicator, explanation, source freshness, latest computed time, disclaimer |
| `GET /v1/public/barangays/{id}` | public              | indicator, supported context, aggregated verified reports, advisories, source links  |
| `GET /v1/public/conditions`     | public              | current named rainfall/river/dam/tide observations with source and freshness         |
| `GET /v1/public/advisories`     | public              | active official notices and original source links                                    |
| `POST /v1/reports`              | public              | submit constrained resident report; return receipt ID only                           |
| `GET /v1/ops/...`               | authenticated staff | review queue, source health, audit history, reports, reports export                  |

Example public status response:

```json
{
  "schemaVersion": "1.0",
  "area": "Malolos City",
  "indicator": "monitor",
  "computedAt": "2026-09-02T08:30:00Z",
  "dataCompleteness": "limited",
  "disclaimer": "Community indicator, not an official flood forecast.",
  "officialAdvisories": [
    {
      "issuer": "PAGASA",
      "issuedAt": "2026-09-02T00:00:00Z",
      "sourceUrl": "https://www.pagasa.dost.gov.ph/flood"
    }
  ],
  "sources": [
    {
      "name": "Bulacan PDRRMO observed rainfall",
      "observedAt": "2026-09-02T00:00:00Z",
      "freshness": "fresh",
      "sourceUrl": "https://pdrrmo.bulacan.gov.ph/"
    }
  ]
}
```

Version the API and publish an OpenAPI contract. Validate client responses in the static site; if the API is unavailable or returns an unknown schema, show the source links and a clear unavailable state rather than stale cached conditions.

## Dashboard integration

Do not add a live `/bantay-baha` route until the API launch gate is met. Once approved:

- Render a prominent status card with label, computed time, limited-data state, source links, and the non-official disclaimer.
- Render observations in accessible HTML tables before enhancing with charts/maps. Status cannot rely on colour alone.
- Map only officially licensed layers. Provide a table/list equivalent, keyboard access, descriptive labels, and a no-JavaScript source/advisory fallback.
- Display reports as aggregated, verified, time-bounded information; never place individual residences or raw submissions on the public map.
- Keep original official advisory text/link separate from BetterMalolos analysis.
- Update service-worker policy so live API responses use a short network-first cache or are not cached; never cache resident submissions or authenticated operations pages.

## Automated situation reports

Create an internal-only daily report and allow an incident-triggered run approved by staff. Generate CSV first. Generate PDF only after the `pdf` generation/rendering workflow has a visual QA step.

Include: last 1/3/6/24-hour rainfall totals when derivable and clearly labelled by station; river/dam changes; active official notices; verified report aggregates by barangay; road-passability counts; unreviewed/uncertain report counts; source freshness; scoring ruleset version; and a list of failed/stale sources. Every number needs source time and source link/reference. Do not include contacts, precise report locations, or raw resident text.

## Security, reliability, and observability

- Store secrets in the deployment secret manager; provide `.env.example` with names only. Never commit `.env`.
- Require staff authentication, least-privilege roles, MFA where available, CSRF protection for browser operations, secure cookies, and an audit log for every sensitive read/export/action.
- Validate all input at the API boundary, parameterize queries, use object-storage allowlists, virus-scan approved uploads, and set request-size limits.
- Encrypt data in transit and at rest where the platform supports it. Back up database and snapshots, test restoration, and document retention/deletion jobs.
- Monitor collector duration, source HTTP status, parser errors, snapshots/observations produced, freshness, API latency/error rate, moderation backlog, and public-status `unknown` rate.
- Alert maintainers for repeated source failures, parser-schema drift, 90-minute critical-feed staleness, error-budget breach, or failed backup.
- Add a kill switch that hides public indicators/reports and leaves authoritative source links and emergency notice available.

## Delivery phases and acceptance criteria

### Phase A — Foundations (internal only)

- [x] Create service skeleton, local Docker Compose, migrations, typed settings, health/readiness endpoints, structured logging, and CI. Readiness now returns 503 on failed checks, and CI type checking is mandatory; see the follow-up test caveats below.
- [x] Implement snapshot storage, `source_registry`, station/observation model, audit log, and a one-command local collector run.
- [x] Add fixtures and tests for Bulacan PDRRMO rainfall, river, dam, tide, and flooding tables, including a populated flooding-row fixture.
- [x] Add a source health/freshness internal endpoint at `GET /v1/ops/health/sources`.

**Exit:** A scheduled, idempotent run stores an auditable raw snapshot and valid parsed measurements; a changed page fails visibly without corrupting prior values.

#### Phase A implementation audit — 2 September 2026

**Final engineering verdict: Phase A implementation is complete and verified; operational closure is pending approval and deployment evidence.** The service satisfies the manual and scheduled-job contracts in code: raw bodies are saved before parsing, local and S3-compatible snapshot storage are implemented, parsed writes are transactional, exact observations are idempotent, corrections link to superseded records, malformed required tables fail closed, invalid source dates remain explicitly unparseable, and internal health/freshness endpoints expose failure safely. No `/v1/public/*` endpoint or live Bantay Baha site route was added, so the intended internal-only safety boundary remains intact.

> **Zero-budget deployment revision — 2 September 2026:** The verdict above describes the originally implemented PostgreSQL/S3 target. The deployment target is now the owner's existing Hostinger MariaDB database with compressed raw snapshots stored in that same database. Phase A engineering is therefore reopened until the schema, migrations, transaction/idempotency behavior, readiness checks, scheduler guardrails, and integration tests pass against MariaDB. Do not point the current PostgreSQL-specific migrations at the Hostinger database and assume compatibility.

Repository evidence reviewed:

- `bantay_baha/app/collectors/pdrrmo.py` implements fetch → snapshot → parse → persist and audit events.
- `bantay_baha/app/parsers/pdrrmo.py` implements typed PDRRMO tide, dam, rainfall, flooding, and river parsing using `Decimal` and Manila-to-UTC timestamps.
- `bantay_baha/migrations/versions/001_initial.py` creates the Phase A registry, snapshot, station, observation, and audit tables.
- `bantay_baha/tests/integration/test_collector_contract.py` covers exact-content snapshots, duplicate observations, corrections, a wholly malformed page, and negative rainfall.
- `bantay_baha/tests/unit/test_pdrrmo_parsers.py` and the saved PDRRMO fixture cover current tables and several malformed-input cases.
- `.github/workflows/bantay-baha-ci.yml`, `bantay_baha/docker-compose.yml`, and the service README now target MariaDB for CI/local integration, migration, seed, and one-off collector workflows.

Gap follow-up status:

- [x] Required-table parser failures are rejected before `store_parsed_result`, with a regression test for a missing dam table.
- [x] Rainfall, dam, and river names are checked against `app/data/pdrrmo_allowlist.json`; an unknown station produces a required-table parse error and is not stored.
- [x] Corrections populate `supersedes_id`; migration `004_mariadb_database_snapshots.py` replaces the PostgreSQL partial-index strategy with a MariaDB-compatible nullable active-row key.
- [x] Conditional request headers, per-source cadence limiting, fetch-exception audit snapshots, and reparse coverage were added.
- [x] CI now treats mypy as mandatory; the `|| true` bypass was removed.
- [x] Readiness returns HTTP 503 when a database check fails, with an induced-failure regression test; database snapshot quota status is included in the storage check.
- [x] Staging/production startup refuses to expose ops routes without `OPS_API_TOKEN`.
- [x] A populated flooding fixture and parser/collector assertion were added.
- [x] Source seeding now remains disabled and unapproved. Live fetch requires `enabled`, real `terms_reviewed_at` and `approved_at` timestamps, a named reviewer, confirmed licensing text, and a verified non-pending robots record. Environment variables cannot manufacture approval.
- [x] The scheduler has no ephemeral database fallback, accepts only a durable MariaDB/MySQL URL, verifies the imported schema revision without DDL, and uses database snapshot storage.
- [x] Gzip-compressed raw bodies, SHA-256 verification, per-body limits, tracked database quota enforcement, and database readiness checks are implemented and tested. Local/S3 support remains optional and is not presented as the zero-budget production path.
- [x] Scheduled and CLI collection failures return non-zero; the workflow no longer hides failures with `|| echo`.
- [x] Observation writes use a single transaction and roll back fully on an injected mid-write failure while retaining the already-persisted raw snapshot.
- [x] Invalid source timestamps remain `None` and are stored with `parse_error`; the server clock is not substituted.
- [x] Supplemental tests now assert exact approval, retry/jitter, rate-limit, conditional-header, readiness failure, per-kind freshness, invalid-time, transaction rollback, and durable-storage behavior.
- [x] Unsupported alert-delivery claims were removed. Automated 90-minute alert transport remains future operational work and is explicitly documented as not implemented.

Verification updated on 2 September 2026 with the bundled Python 3.12 runtime:

- `pytest -q`: **42 passed**; one upstream FastAPI/Starlette `httpx` deprecation warning.
- `ruff check app tests migrations`: **passed**.
- `mypy app --ignore-missing-imports`: **passed, 29 source files**.
- Alembic SQLite compatibility smoke: migrations `001` through `004_mariadb_snapshots` applied successfully; offline MySQL SQL generation emits the portable active-key constraint and `MEDIUMBLOB` snapshot column.
- Seed smoke: PDRRMO created with `enabled=false`, `terms_reviewed_at=None`, and no manufactured approval.
- Fixture collector smoke: snapshot persisted and 15 observations parsed (`3` tide, `3` dam, `2` rainfall, `7` river) with zero errors.
- Scheduled workflow validates a MariaDB/MySQL PyMySQL URL, checks schema revision `004_mariadb_snapshots`, stores snapshots in the database, and fails closed without durable credentials.

The **Phase A exit statement remains pending** under the revised zero-budget deployment until these actions are completed:

- [ ] A BetterMalolos owner completes and records the PDRRMO source-use review: terms/notices, robots result, attribution, conservative cadence, identifying User-Agent, and contact/escalation notes. Written PDRRMO permission is needed only if conditions are unclear/restrictive or an official partnership is claimed.
- [ ] Record a named second BetterMalolos reviewer for the source-to-field mapping before publication. If no second person is currently available, keep collection and results internal; this does not require a PDRRMO employee to review the parser.
- [x] Implement MariaDB compatibility, replacing the PostgreSQL partial index with a nullable active-row key and adding a gzip-compressed `MEDIUMBLOB` raw-body column with size/quota safeguards. A phpMyAdmin import artifact is included.
- [ ] Complete the MariaDB CI/container run (or an equivalent disposable MariaDB run) and retain its result; this local workstation did not have a MariaDB server/container runtime available for the implementation verification.
- [ ] Configure the existing Hostinger MariaDB credentials as secrets, run one real scheduled/manual-dispatch collection, and retain evidence that both the raw snapshot body and parsed measurements persist and can be restored. No S3 or VPS is required for the text-only Phase A MVP.

### Phase B — Official sources and internal status

- [ ] Add approved PAGASA basin/dam/advisory collectors and deterministic advisory extraction.
- [ ] Add ruleset-configured scoring, completeness logic, calculation audit records, and internal status view.
- [ ] Conduct source-mapping review and test normal, threshold breach, stale, missing, malformed, and correction cases.

**Exit:** Staff can trace every internal status input back to a timestamped official snapshot, and the system displays `unknown` for inadequate data.

### Phase C — Moderated reports (closed pilot)

- [ ] Complete privacy/security approval, staff roles, retention/deletion jobs, report API, moderation queue, and audit events.
- [ ] Test rate limits, malicious payloads, duplicate clusters, redaction, expiry, reinstatement, and private/public field separation.
- [ ] Run a limited closed pilot with synthetic or consented test reports and train moderators.

**Exit:** No report becomes public automatically; test exports contain no PII; moderators can explain every public aggregate and reverse it.

### Phase D — Public read-only beta

- [ ] Publish OpenAPI contract and read-only public endpoints.
- [ ] Implement static-site dashboard with accessible/no-JS states, source attribution, freshness, disclaimer, and failure state.
- [ ] Complete mobile, keyboard, screen-reader, contrast, API-contract, load, security, and incident-drill testing.
- [ ] Obtain product/operations sign-off and document a rollback test.

**Exit:** The dashboard makes no unsupported claim, exposes no PII, handles unavailable/stale data safely, and the kill switch has been demonstrated.

### Phase E — Operations and reports

- [ ] Schedule daily internal situation report; implement source-health and moderation-SLA metrics.
- [ ] Establish monthly source/parsers/ruleset review and annual privacy/retention review.

**Exit:** An operator can produce a sourced report, diagnose source failure, and safely suppress a faulty public output without engineering access.

## Test matrix

| Area       | Minimum checks                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Parsers    | Fixtures for current and malformed pages; changed headings/tables fail closed; unit/time conversion; duplicate and correction semantics |
| Jobs       | Retries, idempotency, rate limits, snapshot-before-parse, partial failure, stale transition, reparse from snapshot                      |
| Scoring    | Every threshold boundary, missing input, stale input, advisory expiration, ruleset version, manual override audit                       |
| Reports    | Schema/enum/length validation, spam, XSS, rate limit, privacy projection, duplicate cluster, expiry, moderator actions                  |
| API        | OpenAPI/contract, auth/role checks, CORS, no PII in public JSON/cache/logs, pagination and cache headers                                |
| Dashboard  | Desktop/mobile, keyboard, screen reader, colour contrast, no-JS, loading/error/unknown/stale states, source links                       |
| Operations | Backup restore, secret rotation, alert delivery, kill switch, rollback, incident exercise                                               |

Run unit tests and lint/type checks on every pull request; run integration/contract tests against disposable services in CI. Before release, use a staging environment with synthetic data and no public indexing.

## Definition of done

Do not mark Bantay Baha live until all are true:

- [ ] Source-use reviews, mappings, update expectations, attribution, and owner contacts are documented; written publisher permission is recorded where published conditions are unclear/restrictive or a partnership is claimed.
- [ ] Every public value has a source, source time, fetch time, units, and freshness state.
- [ ] Parser/source failure yields `unknown` or unavailable, never false reassurance.
- [ ] Official advisories retain issuer, original wording/link, issue/expiry time, and visual separation from community analysis.
- [ ] Risk scoring is deterministic, versioned, auditable, and explicitly non-official.
- [ ] Resident reports are privacy-reviewed, moderated, aggregated, reversible, and never automatically published individually.
- [ ] Public endpoints expose no PII, exact home locations, staff data, secrets, or unreviewed content.
- [ ] Accessibility, mobile, no-JS, security, and incident/rollback tests pass.
- [ ] A named operational owner has signed off on on-call, moderation, retention, and the public communication plan.

## Handoff checklist for each implementation PR

Use [the repository PR template](../../.github/pull_request_template.md) and include:

- phase and acceptance criteria addressed;
- sources/fixtures affected and their last verification date;
- schema/API migration and rollback notes;
- privacy/security impact and whether PII can enter the changed path;
- commands/tests run, including stale/malformed-source and failure-state coverage;
- screenshots for public dashboard changes; and
- explicit statement that the change does or does not make any public data or report capability live.
