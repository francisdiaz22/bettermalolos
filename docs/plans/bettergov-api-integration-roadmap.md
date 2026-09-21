# BetterGov API Integration Roadmap for BetterMalolos

**Status:** Proposed

**Audience:** BetterMalolos maintainers, contributors, data partners, and community members

**Purpose:** Add useful, traceable BetterGov data to BetterMalolos in small releases. Each release must leave the site useful if a partner service is unavailable and must make clear what is official, what is partner-provided, and what is locally curated.

## What this roadmap will deliver

BetterMalolos already publishes services, officials, city statistics, budget transparency, and a curated DPWH project list. This work will make selected information fresher and easier to trace without replacing Malolos or Philippine government records as the sources of authority.

| Partner capability                | Malolos outcome                                                           | Initial release |
| --------------------------------- | ------------------------------------------------------------------------- | --------------- |
| Philippine Statistics API and MCP | Dynamic PSA-backed context and PSGC geographic references                 | Phase 2         |
| Philippine Budget API and MCP     | National budget context for programs affecting Malolos                    | Phase 3         |
| DPWH Transparency API             | Better evidence and later status updates for Malolos-linked DPWH projects | Phase 4         |
| Officials portal                  | A reviewed public-official and office directory workflow                  | Phase 5         |
| ASEAN API and MCP                 | An optional peer-city comparison view                                     | Phase 6         |

## Non-negotiable publishing rules

1. **No silent replacement.** Partner API data may enrich a local record but must not overwrite curated Malolos data automatically.
2. **Every figure is traceable.** Show source, source URL, data/release date, retrieval date, unit, and scope near the number or in a details panel.
3. **Official versus contextual data is clear.** LGU-issued reports remain the source of truth for city finances and services. National or partner data is clearly labelled as context.
4. **Graceful failure.** A partner outage must show the last successful snapshot and its retrieval time, never a blank or misleading zero.
5. **Human review before publication.** Automated matches are leads, not verified facts. A maintainer approves all public project, official, and local-area matches.
6. **No personal data collection.** These integrations are read-only. Do not send citizen reports, names, IP addresses, or form submissions to partner APIs.

## Common technical pattern

The current site is a static HTML/JavaScript site. Use a snapshot-first architecture instead of making every visitor's browser depend on an external service.

```text
Partner API -> scheduled collector/validator -> reviewed JSON snapshot in data/ -> BetterMalolos pages
                                      |                         |
                                      +-> provenance log        +-> last-updated/fallback message
```

The collector may be a small Node.js script, initially run by a maintainer and later scheduled by the deployment platform or CI. It should:

- use documented, read-only endpoints and a descriptive `User-Agent`;
- validate the expected response schema before replacing a snapshot;
- preserve the previous valid snapshot when a request fails;
- write a compact provenance record with endpoint, parameters, fetch time, source release, and checksum;
- keep raw responses out of the public site when they are unnecessarily large;
- create a review file for any record matched to Malolos by name, location, district, or PSGC code.

Suggested shared fields for every generated record:

```json
{
  "source_name": "Philippine Budget Data API",
  "source_url": "https://budget.bettergov.ph/api/v1/...",
  "retrieved_at": "2026-09-21T00:00:00+08:00",
  "source_release": "FY 2026 GAA",
  "scope_note": "National-government context; not an LGU Malolos appropriation",
  "review_status": "reviewed"
}
```

## Phase 0 — Foundation and public commitment

**Goal:** Establish the data contract and set expectations before displaying any new external data.

### Site work

- Add a short `Data sources and freshness` note to the Statistics and Budget pages.
- Create `data/provenance/` for generated metadata and `scripts/bettergov/` for collectors and validators.
- Document a standard status vocabulary: `verified`, `reviewed`, `pending-review`, `source-unavailable`, and `archived`.
- Add a contributor checklist requiring source link, retrieval date, scope note, and reviewer for new API-derived records.

### Acceptance checks

- A visitor can distinguish an LGU record from national/partner context.
- A failed fetch cannot delete or replace the last approved public data.
- A contributor can reproduce a displayed API figure from its recorded endpoint and parameters.

### Social post

> We’re building BetterMalolos’ next data layer: clearer sources, freshness dates, and easier-to-check public information. We will release it in small pieces, starting with Philippine statistics and budget context. Every new figure will show where it came from and when it was checked. #BetterMalolos #OpenData #Malolos

### Publish assets

- One simple graphic: “Source → Review → BetterMalolos.”
- Link to this roadmap and invite residents to suggest priority questions they want public data to answer.

## Phase 1 — API proof of concept and snapshot pipeline

**Goal:** Prove the integration pattern with small, non-controversial datasets before changing public dashboards.

### Site and data work

- Build one reusable API client with timeout, retry-after handling, schema validation, and cache metadata.
- Fetch and save a small Philippine Statistics catalog/coverage snapshot.
- Fetch and save a small Budget API sample query relevant to public works or education.
- Add a maintainer-only review report showing changed records, source URLs, and failures.
- Keep the public pages unchanged until data and provenance pass review.

### Acceptance checks

- Two successful manual runs produce valid snapshots and provenance files.
- An intentionally invalid response is rejected and leaves the previous snapshot intact.
- The review report identifies additions, removals, and changed monetary values.

### Social post

> Behind the scenes: BetterMalolos is testing a safer way to bring public datasets into the site. The goal is not more numbers—it’s numbers that can be checked, dated, and explained. Our first public data release comes next. #CivicTech #BetterMalolos

### Publish assets

- Screenshot of the provenance/review screen with no sensitive configuration shown.
- A short explainer: “Why we cache and review public data before publishing.”

## Phase 2 — Malolos statistics and geographic reference

**Goal:** Make the Statistics page more current and more useful for questions about Malolos in its provincial and national context.

### Site and data work

- Use the Philippine Statistics API catalog to identify approved datasets for population, employment, agriculture, education, or other locally relevant topics.
- Use the PSA classification API to store the reviewed PSGC reference for Region III, Bulacan, City of Malolos, and its barangays.
- Publish a new `Malolos data context` module on `/statistics/` with topic, period, unit, source, release, retrieval date, and an explanation of what the value does and does not mean.
- Start with no more than three indicators. Do not infer barangay-level values if the dataset only supports city, provincial, or regional scope.
- Add a downloadable CSV link only where the source/API terms and the snapshot permit it.

### Acceptance checks

- Each indicator has an exact dataset identifier and source release.
- Geographic labels and codes are reviewed against PSA classification results.
- The page communicates missing data as unavailable, not zero.
- Mobile and keyboard checks pass for the new module.

### Social post

> New on BetterMalolos: a clearer statistics section with public-source context for understanding our city. Each indicator includes its source, period, and update date—so residents can check the data, not just take it on trust. Tell us which local question we should explore next. #MalolosData #OpenGovernment

### Publish assets

- One carousel: “What the indicator means / where it comes from / how current it is.”
- A link to `/statistics/` and an invitation to submit source corrections through the Ideas page.

## Phase 3 — National budget context for Malolos

**Goal:** Place the existing local fiscal transparency information beside clearly-labelled national funding that may affect Malolos residents.

### Site and data work

- Query the Budget API for enacted GAA programs related to flood control, roads, school buildings, health facilities, and other reviewed priorities.
- Add a `National funding context` section to `/budget/`, separate from LGU Malolos revenues, expenditures, and financial reports.
- Display budget stage correctly: `GAA` is enacted; `NEP` is proposed. Never combine them into a single total.
- Display all values in exact Philippine pesos and explain that a department/district allocation is not necessarily an amount exclusive to Malolos.
- Link national budget results to matching local DPWH project cards only after a human reviews project name, fiscal year, implementing office, and location.

### Acceptance checks

- Every displayed amount has its fiscal year, budget stage, endpoint, and scope note.
- No national allocation is presented as city revenue or an LGU appropriation.
- A reviewer can trace each highlighted result to a Budget API response.
- The current local SRE/fiscal page continues to work when the partner API snapshot is unavailable.

### Social post

> We’ve added national-budget context to BetterMalolos’ transparency work. You can now see selected public programs connected to infrastructure and services that affect Malolos—clearly separated from the City Government’s own budget. Sources and fiscal years are included. #BudgetTransparency #Malolos

### Publish assets

- A side-by-side graphic: “City budget” versus “National program funding.”
- One worked example showing why fiscal year and budget stage matter.

## Phase 4 — DPWH project evidence and progress tracker

**Goal:** Upgrade the existing curated DPWH list into an evidence-based tracker, beginning with the FY 2026 Malolos-linked project set.

### Site and data work

- Confirm the DPWH partner API’s documented schema, availability, rate limits, and legal/source requirements before connecting it.
- Create a reviewed match table between partner records and `data/dpwh-projects-2026.json`; do not rely on title matching alone.
- Add project fields incrementally: contract/award reference, contractor, implementing office, budget amount, location, project stage, source link, last checked, and evidence status.
- Publish filters for barangay, category, fiscal year, and verification status.
- Keep citizen reports distinct from government/partner records and label them `community observation — unverified` until reviewed.

### Acceptance checks

- A record cannot show “completed,” “delayed,” or a contractor name without a linked source and retrieval date.
- Duplicate or conflicting records are flagged for review rather than merged automatically.
- Each project card remains readable on mobile and accessible by keyboard.

### Social post

> Next up: a stronger way to follow DPWH projects in Malolos. We’re beginning with the projects already listed on BetterMalolos and will add evidence links, update dates, and clear verification labels—so “planned,” “awarded,” and “completed” are not confused. #InfrastructureWatch #Malolos

### Publish assets

- A short screen recording of filtering projects by barangay and status.
- A plain-language legend for project-status labels.

## Phase 5 — Officials and public office directory

**Goal:** Improve the Government Directory while protecting accuracy and avoiding false claims about current officeholders.

### Site and data work

- Confirm the BetterGov Officials portal’s source, fields, refresh policy, and API/exports before any integration.
- Compare partner records with `data/officials.json` and official Malolos/LGU sources.
- Publish only public office details necessary for civic contact: name, elected/appointed role, office, term/verification date, official contact channel, and source.
- Add `Report a correction` instructions; changes require review before publication.
- Avoid copying personal addresses, personal phone numbers, or unsupported party/biographical data.

### Acceptance checks

- Every public official has an explicit `verified on` date and source link.
- Conflicts produce a review queue; the newest third-party record does not automatically win.
- The directory makes it easy to contact the right office even when an individual record is pending verification.

### Social post

> We’re improving BetterMalolos’ public office directory with a simple rule: current information must be checkable. As we update entries, each will show a source and verification date, and residents will have a clear way to flag corrections. #PublicService #Malolos

### Publish assets

- A graphic explaining “official source,” “verified date,” and “report a correction.”

## Phase 6 — ASEAN comparison, only when useful

**Goal:** Offer measured regional context without turning the site into a ranking page or implying false comparability.

### Site and data work

- Confirm the ASEAN API’s available indicators, geographic level, metadata, and licensing.
- Select at most three indicators that have compatible definitions and periods for Malolos/Bulacan/Philippines and comparator cities or regions.
- Publish an experimental `Malolos in regional context` page or Statistics subsection, clearly labelled as comparative context.
- Include methodology notes explaining comparability limits, currency/price adjustments if applicable, and missing data.

### Acceptance checks

- No chart compares incompatible geography, period, unit, or methodology.
- The page explains why each comparator was chosen.
- The feature can be removed without affecting core city-service pages.

### Social post

> We’re exploring a careful way to put Malolos in regional context using public ASEAN data. This will not be a leaderboard. It will be a small, sourced comparison tool that helps us ask better questions about resilience, opportunity, and public services. #ASEAN #MalolosData

### Publish assets

- One methodology-first explainer before publishing any comparison chart.

## Operating cadence after launch

| Dataset type           | Fetch cadence                                           | Public update rule                               | Human review                                       |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------- |
| PSA statistics/catalog | Monthly or when a source release changes                | Update approved indicators after validation      | Required for new indicators or changed definitions |
| PSGC reference         | Quarterly or when PSA publishes a new release           | Update codes/labels after comparison             | Required                                           |
| National budget        | On GAA/NEP release and quarterly for execution datasets | Publish source-specific snapshots                | Required for featured Malolos connections          |
| DPWH project data      | Weekly when the endpoint supports it                    | Show last verified status, not inferred progress | Required for new/changed project facts             |
| Officials directory    | Monthly and after election/appointment events           | Update only verified public-office records       | Required                                           |
| ASEAN comparison       | Quarterly or when the source updates                    | Update only after methodology review             | Required                                           |

## Measurement and community feedback

Track only privacy-preserving, aggregate indicators:

- page visits and outbound source-link clicks;
- searches and filters used on statistics, budget, and project pages;
- number of corrections submitted, accepted, and resolved;
- age of the most recent valid snapshot; and
- number of records with complete provenance.

Do not measure individual citizen behavior or expose report submitters. Publish a small quarterly changelog: what changed, why, source status, and known limitations.

## Decision gates

Do not move to the next public phase until the current phase meets its acceptance checks. Pause a specific integration if the source is undocumented, unstable, incompatible with the site’s privacy commitments, or unable to provide sufficient provenance. The core BetterMalolos pages should remain independent and useful in all cases.

## Initial ownership checklist

| Role                               | Before Phase 1                                  | During releases                          |
| ---------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| Maintainer                         | Approve architecture and repository paths       | Review snapshots and publish releases    |
| Data reviewer                      | Define approved datasets and match rules        | Check sources, scope, units, and changes |
| Developer                          | Build client, validator, and fallback rendering | Maintain collector and UI accessibility  |
| Community/social lead              | Prepare each release post and visual            | Collect questions and correction leads   |
| LGU/agency liaison, when available | Validate official local references              | Resolve source conflicts and corrections |

## Useful reference links

- [Philippine Statistics API and MCP](https://statistics.bettergov.ph/api)
- [Philippine Budget Data API documentation](https://budget.bettergov.ph/docs)
- [BetterGov Officials portal](https://officials.bettergov.ph)
- [DPWH Transparency partner API](https://api.dpwh.bettergov.ph)
- [ASEAN partner API](https://asean.bettergov.ph/api)

The last three links require a documented contract review before they enter the public integration pipeline.
