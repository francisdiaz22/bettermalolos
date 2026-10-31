# BetterGov data contract

BetterMalolos uses external partner data as contextual evidence, not as an automatic replacement for curated Malolos records.

## Required fields

Every API-derived record or snapshot must include `source_name`, `source_url`, `retrieved_at`, `source_release`, `scope_note`, and `review_status`. Monetary values must identify `currency` and `unit` or inherit an explicit declaration from the source response. Query parameters must be preserved in the provenance record.

## Status vocabulary

- `verified`: checked against an authoritative source and approved for the stated claim.
- `reviewed`: a maintainer checked the source, scope, and schema; suitable for publication as labelled.
- `pending-review`: collected but not publishable.
- `source-unavailable`: refresh failed; retain and label the last successful snapshot.
- `archived`: retained for history and not presented as current.

## Publishing rules

Partner data never silently overwrites local data. BetterGov or other partner data must be labelled as context, with its scope and retrieval date close to the value. A failed refresh must preserve the previous valid snapshot. A human reviews the Malolos scope before publication.

## FY2027 NEP / House Bill 10858 transparency data

The contract for the transparency portal lives in `scripts/bettergov/hgab-2027-contract.mjs`. Its scope configuration is the source of truth for collector queries and inclusion labels. Snapshots for this source are separate from the existing Malolos LGU fiscal records and from the `/budget/` BetterGov FY2026 sample.

### Scope queries

All requests use `GET https://budget.bettergov.ph/api/v1/hgab/2027/datasets/{dataset}/projects` with `limit` / `offset` pagination.

- `bulacan-province`: `dpwh` with exact `office` values `Bulacan 1st District Engineering Office`, `Bulacan 2nd District Engineering Office`, and `Bulacan 3rd District Engineering Office`. Project-title searches do not add records to this scope.
- `malolos-city`: `dpwh` with exact `office=Bulacan 1st District Engineering Office`, plus `q=Malolos` searches in `dpwh`, `fmr`, `hfep`, and `nia`. Office assignment and title search are distinct inclusion reasons. The Bulacan 1st office serves more than one congressional district, and title search can return namesake or spanning projects; neither defines a complete physical-location inventory.

The normalized identity is `{dataset}:{source project id}` because IDs are only guaranteed within a dataset. Repeated results with the same identity are represented once and retain every distinct `{reason, dataset, parameters}` entry in `inclusion_reasons`. Rows from different datasets are not merged even if their raw IDs happen to match.

Each query must be fully paginated. The collector must compare the number of collected rows with the API's `data.total`, reject duplicate IDs within one query, and fail the whole candidate snapshot if any endpoint or page fails or has an invalid shape. It must not turn a failed query into an empty result. A candidate snapshot is written atomically only after all configured queries validate; a failed refresh leaves the last snapshot and its backup intact and records/report the refresh failure as `source-unavailable` in operational status. No partially refreshed scope is publishable.

### Snapshot and project fields

The FY2027 snapshot must carry the common provenance fields above plus `fiscal_year: 2027`, the selected scope ID, all exact endpoint/query parameters and page totals, API overview metadata (including source commit/build fields exactly as returned), and verbatim source notices/disclaimers. The retrieval time is the collector's UTC timestamp. `source_release` is the API-reported source commit/build identity when present; otherwise it is `Not stated by source`, never an invented release label. Amounts inherit only the response-declared `PHP` / `pesos` units. The project record retains version amounts as nullable values, match/status wording, inclusion reasons, API project URL, per-version PDF URLs (including page fragments), and the full source row. Missing or null amounts remain unknown; do not coerce them to zero.

The API's House bill terms, status vocabulary, source documents and notices are retained from the overview response. The portal interpretation notice is stored separately and displayed alongside figures. A one-version-only row is a candidate for further review, not a conclusive insertion/deletion. BetterGov API figures are published budget-document figures, not actual spending, project completion, or Malolos LGU appropriations.

### Freshness and unavailable data

FY2027 budget documents change infrequently, so the initial display policy is: snapshots up to 180 days after `retrieved_at` may be shown with their retrieval date; older snapshots are labelled stale and require a refresh/review before they are presented as current. A failed refresh preserves the last valid snapshot and exposes an unavailable/stale state with its last successful retrieval date. If no valid snapshot exists, the scope is unavailable; it must not be rendered as a successful empty result. This age threshold is an application display rule, not an API claim about freshness.

All newly collected snapshots start as `pending-review`. A maintainer must compare query totals, inclusion reasons, amount nulls, source notices, and representative PDF links before changing a snapshot to `reviewed` or connecting it to public page data.
