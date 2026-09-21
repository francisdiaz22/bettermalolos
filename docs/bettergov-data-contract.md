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

Partner data never silently overwrites local data. National or partner data must be labelled as context, with its scope and retrieval date close to the value. A failed refresh must preserve the previous valid snapshot. A human reviews matches to Malolos before publication.
