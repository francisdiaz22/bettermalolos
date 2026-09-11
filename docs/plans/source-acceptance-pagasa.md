# PAGASA Source Acceptance — Flood Information Page

> Checklist for the internal `pagasa_flood` collector. Live automated retrieval and public field mapping must remain disabled until the pending approvals below are recorded. A public page is not, by itself, approval for automated reuse.
>
> **Research update — 4 September 2026:** The public-source review is recorded below. It does not constitute BetterMalolos approval or PAGASA permission. PAGASA's published hydrometeorological-data terms include purpose, acknowledgement, and non-redistribution conditions for requested data; their applicability to automated reuse of the public flood page is not explicit. Treat that ambiguity as restrictive and obtain written clarification before enabling live collection or redistribution.

## Source identity

- **Registry name:** `pagasa_flood`
- **Publisher:** Department of Science and Technology — Philippine Atmospheric, Geophysical and Astronomical Services Administration (DOST-PAGASA)
- **Canonical page:** https://www.pagasa.dost.gov.ph/flood
- **Warning legend:** https://www.pagasa.dost.gov.ph/learnings/legend
- **Source type:** official basin/sub-basin flood status, dam water-level table, and links to official artifacts
- **Timezone:** `Asia/Manila`; stored timestamps are normalized to UTC
- **Maintainer:** BetterMalolos Bantay Baha operations
- **Maintainer contact:** `ops@bettermalolos.org`

## Acceptance status

- [x] Record the currently published PAGASA terms/notices and attribution requirements. The finding is restrictive/unclear, so it does not approve use; the intended production `source_registry.licensing_terms` value is recorded below and must be applied by an owner during deployment.
- [x] Review and record the robots result. `https://www.pagasa.dost.gov.ph/robots.txt` returned HTTP 404 when checked; absence of a robots file is not permission. The intended production `source_registry.robots_txt` value is recorded below.
- [x] Review the linked artifacts. The official `/flood` HTML page and its `pubfiles.pagasa.dost.gov.ph` links are publisher-controlled, but linked filenames/artifacts may change. The current collector fetches only the canonical `/flood` page; it must not crawl linked artifacts until each artifact is separately accepted.
- [ ] Approve a conservative fetch cadence and separate freshness policy for the dam table and status/advisory artifacts.
- [x] Record the operational escalation/contact path for source or parser problems.
- [ ] Name a second BetterMalolos reviewer in `second_reviewer` and record `approved_at` only after the source review is complete.
- [ ] Review every proposed public-field mapping separately. Publisher, station/area, metric, location/scope, unit/datum, aggregation, timestamp semantics, thresholds, role, priority, version, and rationale must all match the reviewed record.

Until these boxes are complete, the seeded row remains `enabled=false`, `terms_reviewed_at=NULL`, `approved_at=NULL`, and `second_reviewer='pending'`. Environment variables do not bypass the database approval gate.

## Implemented parser contract

- **Parser version:** `1.0.0` (`PAGASA_PARSER_VERSION`)
- **Fixture:** `bantay_baha/tests/fixtures/pagasa/sample_flood.html`
- **Expected fixture result:** three basin/sub-basin status records, two dam observations, and three internal advisory records
- **Dam timestamps:** taken only from the source-published dam date/time and converted from Manila time to UTC; the fetch clock is stored separately as `fetched_at`
- **Basin/advisory timestamps:** never inferred from the fetch time. If the page/link does not publish reliable issue and expiry times, the record remains low-confidence, internal, and ineligible as an active/scored advisory.
- **Failure behavior:** missing or unrecognizable basin or dam tables fail the snapshot atomically. The raw snapshot and failure audit remain; no partial current condition is stored.
- **Source wording:** status/advisory wording and source URL are retained. The service does not reinterpret a PAGASA label as a Malolos-local condition.

## Mapping boundary

PAGASA basin, sub-basin, or dam information is not automatically equivalent to a PDRRMO rainfall, river, flooding-situation, tide, or threshold field. No production mapping is seeded. A reviewed mapping may be enabled only where the exact geographic and measurement equivalence is documented. Otherwise the affected field remains `unknown`.

## Approval record

Complete this section before changing the source registry row:

- **Terms/notices finding:** Reviewed 4 September 2026. The PAGASA privacy notice addresses visitor/personal-data processing and does not grant content-reuse rights. PAGASA's published *Terms and Conditions of Use for Hydrometeorological Data* apply to requested hydrometeorological data and require use only for the acknowledged purpose, full acknowledgement, and no redistribution/publication. Because the document does not clearly distinguish public-page observations from requested datasets, automated retrieval and republication remain **not approved pending written PAGASA clarification**. Production registry wording: `Restricted/unclear — PAGASA HMD hydrometeorological-data terms require an acknowledged purpose, attribution, and prohibit redistribution of requested data. Applicability to the public flood page is unclear. Written PAGASA clearance is required before live automation or redistribution.`
- **Terms sources:** https://pubfiles.pagasa.dost.gov.ph/hmd/hmdas/tou.pdf and https://www.pagasa.dost.gov.ph/privacy-notice
- **Robots finding and date checked:** Checked 4 September 2026; `GET https://www.pagasa.dost.gov.ph/robots.txt` returned HTTP 404. Production registry wording: `No robots.txt policy published at the canonical host (HTTP 404 checked 2026-09-04); this is not permission. Obey written PAGASA terms/clearance and the conservative application cadence.`
- **Canonical-artifact finding:** `https://www.pagasa.dost.gov.ph/flood` is the canonical collection target. Its dam update and basin-status links are on PAGASA-controlled hosts, but are not independently approved collection targets. Do not recursively fetch them. Retain source URLs for traceability only.
- **Proposed cadence and rationale (not yet approved):** 30 minutes during active internal monitoring, using conditional requests and the database overlap guard. This is intentionally slower than near-real-time polling and must be reduced or disabled if PAGASA requests it. No scheduled fetch is allowed until written clearance and both reviewers approve.
- **Proposed freshness warning/unavailable thresholds (not yet approved):** dam observations: warning at 30 hours, unavailable at 54 hours; untimestamped basin/status links: internal low-confidence display only and never active/scored. A later timestamped advisory type requires its own reviewed expiry policy.
- **Attribution wording:** `Source: DOST-PAGASA Hydro-Meteorology Division — Flood Information (pagasa.dost.gov.ph). Retrieved <timestamp>. BetterMalolos is not an official PAGASA service; verify warnings and instructions with PAGASA and local authorities.` This is a proposed minimum and remains subject to PAGASA's written response.
- **Operational contact/escalation:** BetterMalolos owner → `ops@bettermalolos.org`; for source-use or flood-data clarification, PAGASA Hydro-Meteorology Division through trunkline `(02) 8284-0800` (the official key-officials page lists the division chief at local 4830; PAGASA public flood communications also list local 4855). For general public-information escalation: `information@pagasa.dost.gov.ph`, locals 1100–1101. Record the case/reference and response in this file; do not enable while unresolved.
- **Primary reviewer/date:** pending
- **Second reviewer/date:** pending
- **Approved mapping versions:** none
- **Live collection evidence:** none

## Required owner action before approval

Send PAGASA a written request that identifies BetterMalolos, the exact `/flood` page fields, 30-minute conditional-fetch proposal, internal/public uses, retained raw snapshots, attribution wording, and non-commercial civic purpose. Ask whether the published hydrometeorological-data terms apply and whether automated retrieval, storage, and public redistribution are permitted. Retain PAGASA's response or case/reference here. A BetterMalolos primary reviewer and a different named second reviewer must then sign off; neither approval may be inferred from this research record.
