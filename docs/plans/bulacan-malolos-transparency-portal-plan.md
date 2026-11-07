# Bulacan and Malolos FY2027 Transparency Portal — Agent Plan

**Status:** Phases 1–5 complete; FY2027 snapshot reviewed and ready for publication

**Working branch:** `feat/bulacan-malolos-transparency-portal`

**Route:** `/transparency/`

**Primary outcome:** Give residents two clearly separated, source-linked views of FY2027 national budget projects associated with Bulacan Province and Malolos City.

## Agent brief

Implement a transparency portal inside BetterMalolos, using the public BetterGov.ph FY2027 Budget API and adapting the approach and data rules in [bettergovph/transparency-portal](https://github.com/bettergovph/transparency-portal). The portal has two scopes in one user experience. Visitors switch between **Bulacan Province** and **Malolos City**; the data and scope rules for each view must remain distinct.

This portal reports published budget-document figures. It does not report actual spending, confirm that a project was built, or make a conclusive finding when a project appears in only one budget version.

## Decisions already made

- **Fiscal year:** FY2027 only.
- **Budget versions:** 2027 National Expenditure Program (NEP) and House Bill 10858, as exposed by the BetterGov API.
- **Placement:** Inside BetterMalolos at `/transparency/`.
- **Geographies:** Two scopes, selected with a Province/City switcher.
- **Language:** English for the initial release.
- **Data source:** BetterGov.ph Budget API; use its documented FY2027 endpoints and preserve its response notices and disclaimers.
- **Bulacan Province scope:** Projects assigned to Bulacan DPWH offices only. Do not add projects merely because their titles mention Bulacan.
- **Malolos City scope:** Union of projects assigned to Malolos DPWH offices and API results whose project titles name Malolos. Deduplicate overlaps and show all applicable inclusion reasons.
- **Interpretation notice (show wherever budget figures appear):**

  > Amounts reflect published figures in the 2027 NEP and House Bill 10858, not actual spending. A project found in only one version is a candidate for further review, not a conclusive finding.

## Source behavior and limits

The reference portal describes these FY2027 API patterns:

- `GET /api/v1/hgab/2027` for program names, status wording, terms, version names, document list, notices, and disclaimers.
- `GET /api/v1/hgab/2027/datasets/dpwh/projects?office=…` for all project lines assigned to an office.
- `GET /api/v1/hgab/2027/datasets/{program}/projects?q=…` for program lines whose titles name a place.
- `GET /api/v1/hgab/2027/datasets/{program}/projects/{id}` for a project's version amounts, source PDF pages, matching/read labels, and notes.
- District endpoints can provide office and district context when needed.

The BetterGov API does not currently provide a definitive city/municipality location for every project. Malolos title matches can therefore be incomplete or ambiguous. Do not imply that title matching is a complete geographic inventory. Keep the office-assigned and title-match reasons visible on each relevant project, and explain the location limitation on the About/data page.

For project rows matching both Malolos rules, display one row and both reasons. If the API exposes an uncertain match or null amount, preserve that state; do not infer zero, insertion, deletion, or project completion.

Reference documentation:

- [Transparency Portal README](https://github.com/bettergovph/transparency-portal)
- [Reference API notes](https://github.com/bettergovph/transparency-portal/blob/main/docs/api.md)
- [BetterGov Budget API docs](https://budget.bettergov.ph/docs)

## Fit with this repository

Before implementation, inspect the current `/budget/` page, its data pipeline, and these local contracts:

- [BetterGov API integration roadmap](bettergov-api-integration-roadmap.md)
- [BetterGov data explorer plan](bettergov-data-explorer-plan.md)
- [BetterGov data contract](../bettergov-data-contract.md)

Keep the portal consistent with BetterMalolos' current app structure, styling, language handling, static hosting, and data provenance practices. Do not transplant the reference portal's React/Vite app wholesale into this repository. Use the BetterGov API as the source of truth, but follow the repository's approved collection/publication pattern for browser-facing data. Preserve API query parameters, retrieval/build date, source release, source links, currency/unit, geographic scope, and review status with the data. Do not expose credentials or invent API fields.

Keep the existing local Malolos fiscal records separate from BetterGov's national budget comparison. Never label BetterGov amounts as Malolos LGU appropriations unless the API explicitly supports that claim.

## Proposed experience

### Main route: `/transparency/`

- Page title and short explanation of the FY2027 NEP/House Bill comparison.
- Accessible, keyboard-operable **Bulacan Province / Malolos City** switcher.
- In-scope summary figures drawn only from the selected scope; clearly identify each budget version and unit.
- Search, supported filters, sorting, and CSV download if supported by the source data and existing site conventions.
- Project list with visible inclusion reason(s), status/match wording, and links to project details/source pages.
- Clear empty, loading, and unavailable-data states. Missing data must not appear as zero.
- Scope and interpretation notice adjacent to figures and results.

### Project details

For a project, show each available version's amount, the exact source-document page link, API match/reading labels and notes, and why it is included in the selected view. Label candidate-only differences as requiring further review.

### About the data

Explain the FY2027 API queries, the difference between office assignment and title matching, known Malolos location limits, source documents, update/retrieval date, status terminology, and any reviewed exclusions. No project should disappear through an undocumented manual exclusion.

## Implementation phases

### Phase 1 — Inspect and map

1. [x] Trace the existing BetterMalolos budget route, build/data workflow, shared navigation, translations, and CSS tokens.
2. [x] Read the reference portal's configuration, scope implementation, API client, project/detail pages, and About page.
3. [x] Identify the exact API-published office names for Bulacan and Malolos from current district/office data; do not guess labels.
4. [x] Write down the API queries needed for the two scopes and check result counts, pagination, nulls, duplicate IDs, and response disclaimers.
5. [x] Record unresolved scope ambiguity for review before public rendering.

#### Phase 1 findings (checked 2026-10-31)

- **Existing app shape:** BetterMalolos is a static HTML/JavaScript site. `/budget/` is `budget/index.html`; `build.sh` copies public files into `dist/` and retains directory-based clean URLs. The current budget page already separates local LGU SRE/fiscal records from a pending-review BetterGov sample. Its source/freshness note, national-budget context styles, and snapshot renderer are in `data-provenance.css`, `national-budget-context.css`, and `national-budget-context.js`.
- **Shared navigation:** `scripts/sync-navigation.js` owns the shared header. The Projects & Budget dropdown currently links Infrastructure Projects and City Budget & Transparency. `assets/js/main.js` marks `/budget` as the active section; `/transparency` will need to be mapped there. Add any navigation item through the shared template and resync pages rather than editing individual headers.
- **Language and styling:** `assets/js/translations.js` supplies English and Filipino strings; the requested first release is English, but new navigation labels need both entries if they use the shared translation system. CSS tokens live in `assets/css/style.css` (`--color-primary`, `--color-secondary`, `--color-bg`, `--color-text`, spacing, radius, and Inter/Montserrat font tokens). Budget pages load shared responsive and accessibility CSS plus transparency/provenance styles.
- **Snapshot and deployment contract:** `scripts/bettergov/api-client.mjs` provides timed/retried JSON fetches, shape checks, checksums, and snapshot provenance. `scripts/bettergov/snapshot-pipeline.mjs` currently covers GAA/PSA proof-of-concept sources, not HGAB. The data contract requires source, query parameters, retrieval/source release, scope, units, and review status; public HTML must consume a reviewed local snapshot, not browser-fetch this API. `build.sh` copies static route and data files and excludes docs/scripts from the production package.
- **Reference portal review:** The upstream `portal.config.ts` defines configured office/place scopes and explicit exclusions; its API client fetches all pages and retains source notices. Its main list supports filters/sort/CSV, detail pages link exact PDF pages, and About publishes queries, counts, hand exclusions, documents, terms, notices, and disclaimers. Adapt those behaviors and source rules; do not transplant its Vite/React app. See [reference README](https://github.com/bettergovph/transparency-portal), [reference API notes](https://github.com/bettergovph/transparency-portal/blob/main/docs/api.md), and [BetterGov API docs](https://budget.bettergov.ph/docs).
- **Current source snapshot:** Live checks used `GET /api/v1/hgab/2027` and `/api/v1/hgab/2027/districts` (district list: 254 total; retrieved first 200 for office discovery), plus project queries below. API metadata reported source commit `a0caa778442cdae5583f5a006ea7401dab00e5ac`, built `2026-10-26T08:46:14.383Z`, currency `PHP`, scale `pesos`, and an independent/unofficial notice. The overview also returns a `disclaimer-no-allegations`; project responses carry relevant notices and disclaimers. Preserve these verbatim alongside the plan's interpretation notice.

| Scope query | Exact API query | Result count | Checks |
| --- | --- | ---: | --- |
| Bulacan Province | `datasets/dpwh/projects?office=Bulacan 1st District Engineering Office` | 152 | No duplicate IDs within result |
| Bulacan Province | `datasets/dpwh/projects?office=Bulacan 2nd District Engineering Office` | 191 | No duplicate IDs within result |
| Bulacan Province | `datasets/dpwh/projects?office=Bulacan 3rd District Engineering Office` | 55 | No duplicate IDs within result |
| Bulacan Province | Union of the three office queries | 398 | No cross-office duplicate IDs; 66 rows have a null amount in at least one version |
| Malolos City title search | `datasets/dpwh/projects?q=Malolos` | 27 | 3 rows have a null amount in at least one version; 19 IDs overlap the Bulacan office union |
| Malolos City title search | `datasets/fmr/projects?q=Malolos` | 0 | Empty result |
| Malolos City title search | `datasets/hfep/projects?q=Malolos` | 0 | Empty result |
| Malolos City title search | `datasets/nia/projects?q=Malolos` | 0 | Empty result |

The lists support `limit`/`offset` pagination (up to 200 rows per request) and return total/next offset; all non-empty scope sets fit on one 200-row page at this check. Project IDs were unique in each result. Null means a version has no such amount, not zero. The Malolos rule uses only the Bulacan 1st office (152 rows) plus 27 title matches; 19 IDs overlap those two inputs, leaving 160 unique rows. The 406 count would combine all three Province offices with the Malolos title query and is not the configured Malolos scope.

#### Scope review gate for Phase 2

- API district detail for `leg:bulacan:1st` identifies **Bulacan 1st District Engineering Office** as the published matched label for the office serving the Malolos congressional district. The same office serves Bulacan's 2nd and 5th districts, so office-assigned Malolos records include projects beyond Malolos by design. API title-query results are another distinct inclusion reason: they include **Central Office** rows and a road title naming Malolos while describing work in Calumpit. Neither rule alone is a definitive project-location inventory.
- There is no dedicated “Malolos DPWH office” label in the returned district/office records. The Phase 2 scope should explicitly map Malolos office assignment to the Bulacan 1st DEO and title matches to their own reason; keep cross-district/shared-office context visible. Review the Calumpit road and similar spanning/namesake titles before deciding whether any record needs a documented exclusion. Do not imply that either query identifies every project physically located in Malolos.
- Province scope is unambiguous under the settled decision: include only the three exact Bulacan DEO published names above. Do not add title-only results.

### Phase 2 — Define scope and data contract

1. [x] Define two explicit scope configurations: `bulacan-province` (Bulacan office list only) and `malolos-city` (Bulacan 1st DEO plus place-title queries).
2. [x] Store project inclusion reasons with each normalized project. Use dataset-qualified stable IDs to deduplicate overlap without merging unrelated datasets.
3. [x] Specify source URL, endpoint/query, API source metadata, retrieval timestamp, fiscal year, version amounts/currency, PDF page links, match status, and source disclaimers.
4. [x] Keep unknown values as unknown. Define atomic collection failure and stale snapshot handling under the local data contract.

#### Phase 2 implementation notes (2026-10-31)

- Added `scripts/bettergov/hgab-2027-contract.mjs` with the exact Bulacan and Malolos query lists, scope notes, reason labels, query URL builder, response normalization, overlap handling, and pagination completeness checks. Project identity includes the dataset key and raw API ID; original source rows remain attached to each normalized project.
- Updated `docs/bettergov-data-contract.md` with the HGAB snapshot fields, required API metadata/notices, unknown-value behavior, atomic failed-refresh behavior, and a 180-day stale display threshold. The threshold is identified as a BetterMalolos policy, not an API freshness claim.
- New HGAB data remains `pending-review` and outside public page data until Phase 5 source validation and maintainer review. No API snapshot or figure was fabricated in this phase.
- Validation performed: inspected the repository's existing snapshot/provenance contract and BetterGov's official FY2027 endpoint documentation. No automated tests or live collection were run in this phase.

Phase 2 exit is complete. Phase 3 will add the route and project views using the reviewed snapshot contract above.

### Phase 3 — Build the route and project views

1. [x] Add `/transparency/` following existing static-site routing and deployment conventions.
2. [x] Implement the Province/City switcher and ensure selection survives refresh and supports browser navigation if consistent with the app.
3. [x] Build scope-aware summary and project lists, supported search/filter/sort, and responsive project detail links.
4. [x] Display the approved interpretation notice wherever figures appear and retain BetterGov response notices/disclaimers.
5. [x] Add accessible loading, no-results, stale-data, and source-unavailable states.

#### Phase 3 implementation notes (2026-10-31)

- Added the static `/transparency/` route with responsive scope controls, summary cards, project search, budget-version filtering, sorting, and expandable source/inclusion details. The selected scope is stored in the URL query string and restored on refresh/back/forward navigation.
- The browser view expects the reviewed `data/bettergov/hgab-2027.json` publication contract (`fiscal_year: 2027`, `review_status: reviewed`, scope project arrays, retrieval/source metadata, notices/disclaimers). It does not fetch BetterGov directly from the visitor's browser.
- At the 2026-10-31 Phase 3 checkpoint, no reviewed HGAB snapshot was available. The pending-review collection stayed outside the public view, which presented a clear reviewed-data-unavailable state instead of a successful empty result or fabricated amounts. Stale snapshots are labeled; null amounts remain “Not stated.” One-version-only rows are described as candidates for further review. The snapshot was reviewed on 2026-11-07; see the Phase 5 decision and review packet below.
- The interpretation notice remains adjacent to the project view, while source notices/disclaimers are rendered from the snapshot when available. Province/City scope notes disclose office and title-match limits.
- Phase 4 remains necessary for shared navigation/localization and the full About/data explanation. Phase 5 remains necessary for source-data validation and handoff verification.

### Phase 4 — Explain the data and integrate navigation

1. [x] Add an About/data explanation with the API queries, inclusion rules, limitations, status vocabulary, and source links.
2. [x] Add the page to the appropriate BetterMalolos navigation/footer entry points, including English localization.
3. [x] Keep BetterGov data visibly separate from local Malolos budgets and fiscal reports.
4. [x] Ensure the route, assets, and links work with the project's clean-URL/static hosting setup.

#### Phase 4 implementation notes (2026-10-31)

- Added `/transparency/about/` with the FY2027 API endpoints and collection approach, exact office/title inclusion rules, source-check counts, geographic limitations, null/match/status interpretation, source links, and the separation from local Malolos fiscal records.
- Added FY2027 project and data-explanation links to the shared Projects & Budget dropdown and route footers. Added English and Filipino navigation strings; the portal's content remains English for this release.
- Synchronized the shared navigation template across public HTML pages and mapped `/transparency/` to the Projects & Budget active section.
- At the 2026-10-31 Phase 4 checkpoint, the reviewed HGAB snapshot had not yet been published; Phase 5 source validation and maintainer review were still outstanding before public figures could appear. The subsequent review decision and publication state are recorded below.

### Phase 5 — Verify for handoff

1. [x] Validate fetched/collected records against actual API responses and compare counts to API pagination.
2. [x] Confirm Province scope has no place-name-only additions.
3. [x] Confirm Malolos scope includes both office-assigned and title-matched records, with overlap appearing once and both reasons shown.
4. [x] Check displayed amounts against raw API rows, version labels, disclaimers, PDF page links, and null/uncertain states.
5. [x] Follow repository instructions for build/navigation validation and record commands and outcomes in the handoff.

#### Phase 5 implementation notes (2026-11-01)

- Added `scripts/bettergov/hgab-2027-pipeline.mjs` to collect the API overview and every configured query/page, reject incomplete/duplicate pagination, validate PHP-peso fields and source-row amount fidelity, verify PDF page-link and project-link shapes, check Province source IDs against its office queries, and deduplicate Malolos by dataset-qualified project ID. It writes atomically and leaves the snapshot `pending-review`.
- Collected live API data on 2026-10-31T17:07:11Z. All seven unique configured queries matched their API totals and unique-ID counts: Bulacan offices 152/191/55 (398); Malolos query inputs 152 from Bulacan 1st DEO plus 27 DPWH title rows and zero FMR/HFEP/NIA rows. Malolos has 160 unique rows, including 19 office/title overlaps, each retaining both reasons. Province contains no title-only additions. The exact filter, `limit=200`, and `offset=0` request parameters are recorded for every query.
- Snapshot field audit: 66/398 Province and 18/160 Malolos records have a null amount in at least one of NEP/latest-House columns; null remains unknown. All 558 scope rows have a BetterGov project link and at least one source PDF page link; all provided links are HTTPS page-fragment links. The three distinct referenced source PDF files returned HTTP 200. The raw API source row is retained, and normalized NEP, House, second-reading, and third-reading amounts are checked against it. API metadata, the full overview, notice, and structured disclaimer are preserved. The UI labels NEP, latest House amount, and second/third-reading source links accurately.
- Corrected the earlier About/plan count description: 406 is not the Malolos scope. The configured Malolos union is 160; Province remains 398.
- On 2026-11-07, the maintainer confirmed human review and approved the configured Province and Malolos scopes. The two Calumpit/spanning title-search rows remain included under the documented title-match rule with the geographic limitation disclosed; no manual exclusions were made. Review metadata is recorded in the snapshot and details are in [the review packet](../review/hgab-2027-review-packet.md).
- Production packaging initially included the pending snapshot as a downloadable JSON file even though the page refused to display it. Added `scripts/bettergov/filter-public-snapshots.mjs` and wired it into `build.sh` so unreviewed snapshots are removed from `dist/data/bettergov/`; reviewed/verified snapshots remain available. This keeps the public data boundary aligned with the page's reviewed-only contract.
- Validation at the 2026-11-01 checkpoint: `npm run check:navigation` passed. `node --check` passed for the HGAB contract, collection/filter scripts, and portal JavaScript. `bash build.sh --no-bump` completed successfully. The built `/transparency/` and `/transparency/about/` routes were present; the then-pending source snapshot was excluded from `dist/data/bettergov/`. The normal version-bumping build was not retained as a release-version change. No automated tests were added or run at that checkpoint.
- Final pre-push validation (2026-11-07): `npm run check:navigation` passed; `node --check` passed for the HGAB contract, collection/filter scripts, and portal JavaScript; `bash build.sh --no-bump` completed successfully without changing the version. Confirmed the built `/transparency/` and `/transparency/about/` routes and reviewed snapshot are present in `dist/`. `git diff --check` passed. No automated test suite was run.

## Acceptance criteria

- `/transparency/` is reachable through the site's existing navigation and direct URL.
- Province/City switcher is accessible by keyboard and screen reader and changes both the visible scope label and data.
- Province records come only from explicitly configured Bulacan DPWH offices.
- Malolos records are the union of configured Malolos DPWH office results and Malolos title results; duplicates are removed without losing reasons.
- Each record has traceable source/query and update context; details link to the exact API/source document page where available.
- The interpretation notice appears wherever amounts are shown; API disclaimers remain visible and unaltered.
- One-version-only records are described as candidates for further review, not confirmed insertions/deletions.
- The UI does not imply actual spending, project completion, or LGU appropriation from these data.
- Missing amounts and unavailable/stale data are not shown as zero or a successful empty result.
- Malolos location limitations are disclosed in plain language.
- Existing local budget/fiscal content continues to be distinguishable and functional.
- The page works at mobile and desktop sizes, including empty and API-unavailable states.

## Agent handoff notes

- Work on `feat/bulacan-malolos-transparency-portal` unless the task coordinator assigns a new branch.
- Treat the decisions in this document as settled. Ask only about genuinely unresolved issues discovered in the API or current repository.
- Do not broaden either scope, change the fiscal year, or add languages without an explicit request.
- Do not silently exclude records. If namesakes or problematic rows require exclusion, document each reason on the About/data page and in the underlying scope data.
- Do not publish guessed API office names, fabricated fixture data, or amounts without traceable source metadata.
- Keep implementation commits reviewable by phase and report modified files, validation performed, and remaining source limitations.
