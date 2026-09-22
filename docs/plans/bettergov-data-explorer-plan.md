# BetterGov Data Explorer — Agent Implementation Plan

**Status:** Planned  
**Owner:** BetterMalolos implementation agent  
**Related roadmap:** [BetterGov API Integration Roadmap](bettergov-api-integration-roadmap.md)  
**Primary outcome:** Give residents one clear place to explore approved BetterGov-adjacent data while preserving source boundaries, review gates, provenance, and graceful fallback behavior.

## Agent brief

Build a public `/explore/` data explorer for BetterMalolos. The explorer must let a visitor switch between available data domains, filter records where appropriate, and inspect provenance without implying that partner data is an LGU record.

The agent must work incrementally. It may implement UI for a source only when a reviewed local snapshot or an already-approved local dataset exists. It must not invent API responses, claim live connectivity, or mark fixture data as reviewed. Unavailable integrations should have an honest disabled or unavailable state with an explanation and a link to the relevant source or roadmap.

The agent may edit site HTML, CSS, JavaScript, tests, data schemas, and documentation within this plan. It must not add credentials, citizen-submitted personal data, direct browser calls to undocumented partner APIs, or automatic publication of unreviewed records.

## Current baseline

The repository currently has:

- A BetterGov snapshot client and fixture pipeline in `scripts/bettergov/`.
- Reviewed PSA context at `data/psa-malolos-context.json`, rendered on `/statistics/`.
- A pending-review BetterGov Malolos budget fixture at `data/bettergov/budget-sample.json`, rendered as a local preview on `/budget/`.
- Curated DPWH project data and category filters, but no reviewed DPWH partner API snapshot.
- A local officials directory, but no verified Officials portal integration.
- No ASEAN comparison dataset or explorer page.

## Product contract

The public explorer must:

1. Make the domain/source selection visible and keyboard accessible.
2. Show only reviewed or explicitly local-curated data as public results.
3. Label BetterGov partner data as context, not City Government data.
4. Show source name, source URL, source release/dataset, retrieval or verification date, unit/currency, geographic scope, and review status near each result or in an accessible details panel.
5. Treat unavailable data as unavailable; never render it as zero, empty success, or current live data.
6. Keep the existing Statistics, Budget, Government, and project pages useful if explorer data fails to load.
7. Work without an external API request from the visitor’s browser. Public pages consume local snapshots or curated data.
8. Preserve deep links and browser back/forward behavior for selected domain and filters.

## Proposed public experience

Create `/explore/index.html`, linked from Statistics and Government navigation as **Data Explorer**.

### Primary controls

- Domain tabs or a segmented control:
  - Statistics
  - Malolos budget data
  - Infrastructure projects
  - Officials and offices
  - ASEAN comparison
- Geography selector where supported: Malolos, barangay, Bulacan, Region III, Philippines, or source-defined scope.
- Period/year selector populated from the loaded dataset.
- Topic/category/status filters appropriate to the active domain.
- Search field for records that support text search.
- `Reset filters` control.

### Result presentation

Use cards for high-level indicators and a responsive table/list for records. Every result must include a compact provenance summary and an expandable **How this data was sourced** panel. The panel must never hide the fact that a value is partner context or locally curated.

### Unavailable and pending domains

The Budget, DPWH API, Officials portal, and ASEAN tabs may initially show a roadmap-aware status card if no approved snapshot exists. The card should state:

- what the planned dataset would provide;
- why it is not currently shown;
- whether the source is pending review, unavailable, or not yet integrated; and
- where the visitor can read the existing local/official information.

## Phase 0 — Contract and explorer shell

**Goal:** Establish the route, data model, navigation entry point, and accessible domain switching without adding unsupported data.

### Agent tasks

- Define an explorer manifest schema with `id`, `label`, `domain`, `availability`, `source_type`, `snapshot_path`, `scope`, `updated_at`, and `provenance` fields.
- Add a small local manifest describing all five domains and their current availability.
- Create `/explore/index.html` with domain controls, status region, filter region, results region, and provenance panel.
- Add shared explorer JavaScript and CSS without coupling it to a partner API.
- Add navigation links from Statistics and Government pages where the site’s existing navigation pattern permits.
- Document the explorer contract and availability vocabulary.

### Acceptance criteria

- `/explore/` loads with JavaScript enabled and has a useful heading, description, and source-boundary note.
- Domain controls are keyboard reachable, have visible selected state, and expose state through ARIA.
- Selecting each domain updates the URL and content without a full-page external API request.
- The initial manifest marks only genuinely available datasets as available.
- Pending/unavailable domains do not show fabricated records or zero values.
- Existing core pages remain unchanged in behavior when the explorer script or manifest fails.
- A Playwright test covers initial load, domain switching, keyboard focus, and unavailable states.

## Phase 1 — Statistics explorer

**Goal:** Make approved PSA context and existing Malolos statistics discoverable through filters and provenance.

### Agent tasks

- Adapt `data/psa-malolos-context.json` to the explorer record contract without duplicating source facts unnecessarily.
- Include the existing approved population, barangay, and PSGC hierarchy context.
- Add topic, period, unit, and geography filters based on actual record values.
- Link population results to the existing barangay/statistics page and source URL.
- Clearly distinguish PSA context from locally maintained statistics.
- Add an optional downloadable CSV only if the data contract and source terms permit it; otherwise omit the control.

### Acceptance criteria

- The Statistics domain displays exactly the approved records available in the snapshot.
- Filtering never invents barangay-level values from city-, provincial-, or regional-level data.
- Each result shows dataset ID, period, unit, scope, source, retrieval date, and review state.
- Missing values are rendered as unavailable, never as zero.
- Results remain usable on mobile and with keyboard navigation.
- Tests verify record count, filtering, provenance, and no external API dependency.

## Phase 2 — Malolos budget explorer

**Goal:** Add a small reviewed BetterGov budget view for Malolos without confusing it with Malolos LGU finances.

### Agent tasks

- Keep the Malolos budget domain hidden from public result mode while `review_status` is `pending-review`; show its pending-review state instead.
- When a maintainer approves a snapshot, render the returned Malolos records without inventing categories or totals.
- Add only filters supported by the approved response, such as period, topic, or category.
- Display exact values, currency/unit, and the snapshot geographic scope beside each amount.
- Link each result to the source endpoint and retain query parameters in the provenance panel.
- Keep local SRE/fiscal transparency records visibly separate.

### Acceptance criteria

- No BetterGov amount is labelled as city revenue or an LGU appropriation unless the source explicitly supports that claim.
- Only records whose geographic scope is confirmed as Malolos are shown as Malolos budget data.
- Pending-review snapshots cannot appear as public results.
- Every amount shows fiscal year, stage, currency, source, retrieval date, and scope.
- A simulated missing snapshot leaves the explorer functional and explains the unavailable state.
- Tests cover pending-review suppression, approved rendering, supported filters, exact currency formatting, scope display, and fallback behavior.

## Phase 3 — Infrastructure project explorer

**Goal:** Expose curated and eventually partner-verified DPWH projects with clear evidence status.

### Agent tasks

- Normalize `data/dpwh-projects.json` and `data/dpwh-projects-2026.json` behind one explorer adapter.
- Add filters for barangay/location, category, fiscal year, project stage, and verification status.
- Show the distinction between local curation, government source, partner evidence, and community observation.
- Add evidence links, last-checked dates, implementing office, and cost only when present in a reviewed source record.
- Create a reviewed match-table schema for future DPWH partner records; do not merge by title alone.
- Flag duplicate/conflicting records in maintainer review output rather than resolving them in the browser.

### Acceptance criteria

- A project cannot display completed, delayed, contractor, award, or cost claims without a source link and checked/retrieved date.
- Curated projects remain visible if the future partner source is unavailable.
- Filters work together and update counts/results accessibly.
- Community observations are never presented as government status.
- Duplicate or conflicting records are not silently merged.
- Tests cover filtering, provenance labels, missing evidence, and mobile layout.

## Phase 4 — Officials and offices explorer

**Goal:** Provide a source-aware directory without making unsupported claims about current officeholders.

### Agent tasks

- Adapt `data/officials.json` into the explorer manifest/record contract.
- Add office, role, branch, term, verification date, and official contact-channel fields only where supported.
- Add source and verification filters.
- Provide a clear correction/reporting link or instruction.
- Prepare a comparison/review schema for future Officials portal records; do not let the newest third-party record automatically win.

### Acceptance criteria

- Every displayed official has a verification date and source.
- Pending or conflicting records show the office contact path without asserting an unverified individual fact.
- Personal addresses, personal phone numbers, unsupported party details, and private data are excluded.
- Tests cover office filtering, verification labels, conflict/pending states, and accessible contact links.

## Phase 5 — ASEAN comparison explorer

**Goal:** Add a methodology-first comparison view only after compatible reviewed data exists.

### Agent tasks

- Define a comparison-record schema containing indicator, geography, period, unit, methodology, source release, and comparability notes.
- Confirm the source’s indicator definitions, geographic level, periods, licensing, and retrieval contract before adding data.
- Limit the first release to at most three compatible indicators.
- Use comparison cards or charts with a visible methodology panel, not a ranking/leaderboard presentation.
- Make the comparison feature removable without affecting core explorer domains.

### Acceptance criteria

- No chart compares incompatible geography, period, unit, currency, or methodology.
- Each comparator has an explicit reason for inclusion.
- Missing or incomparable values are labelled accordingly.
- The page includes source, release, retrieval date, unit, and methodology notes.
- Tests verify that incompatible records are rejected or excluded before rendering.

## Phase 6 — Hardening, QA, and release

**Goal:** Make the explorer dependable, maintainable, and ready for public release.

### Agent tasks

- Add schema validation for the manifest and every public snapshot consumed by the explorer.
- Add fixture tests for valid, invalid, stale, unavailable, pending-review, and empty-data states.
- Add accessibility checks for keyboard operation, focus visibility, labels, announcements, and table semantics.
- Add responsive checks at the project’s supported mobile and desktop widths.
- Add provenance completeness checks to the review report.
- Add a changelog entry and update the BetterGov roadmap with the explorer’s completed phases.
- Confirm build output includes the explorer route and referenced assets.

### Acceptance criteria

- `npm run test:bettergov` passes.
- Relevant Playwright explorer tests pass in the supported browser configuration.
- `npm run build` succeeds and includes `/explore/` in the built output.
- No public explorer result lacks required provenance fields.
- No browser request targets a partner API directly.
- Core Statistics, Budget, Government, and project pages continue to pass their existing tests.
- A reviewer can disable or remove any one domain without breaking the other domains.

## Agent operating rules

### Before each phase

1. Read this plan and the related roadmap.
2. Inspect current data files, review status, and existing tests.
3. Check whether the source contract is documented before adding a new integration.
4. Make the smallest coherent change for the phase.

### During implementation

- Prefer local snapshots and adapters over duplicated page-specific logic.
- Use semantic HTML and progressive enhancement.
- Preserve existing user-facing content and URLs.
- Add or update tests with each behavior change.
- Do not mark a snapshot `reviewed` without an explicit human review decision.
- Do not silently convert unavailable data into stale-looking current data.

### Stop conditions

The agent must stop and report a blocker when:

- the partner endpoint or schema is undocumented;
- source licensing or redistribution terms are unknown;
- a match to Malolos cannot be verified by location, office, period, and identifier;
- required provenance is missing;
- a change would expose personal data or citizen submissions;
- an acceptance test would require treating fixture data as real public data.

## Definition of done

The explorer is complete when the public page supports approved Statistics, Budget, Infrastructure, and Officials records with source-aware filtering and provenance, while ASEAN remains safely unavailable until its comparison contract is satisfied. All five domains have honest availability states, the snapshot-first architecture is preserved, automated tests cover the failure modes, and the roadmap records which phases are complete.
