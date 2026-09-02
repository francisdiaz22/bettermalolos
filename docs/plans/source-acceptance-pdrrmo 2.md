# PDRRMO Source Acceptance — Bulacan PDRRMO Hydrological Page

> Checklist per `docs/plans/bantay-baha-python-automation.md:19` Source acceptance. Collection must remain disabled outside synthetic/internal evaluation until this is fully approved (see `PDRRMO_ENABLED`).

- **Source name:** `pdrrmo`
- **Canonical URL:** https://pdrrmo.bulacan.gov.ph/
- **Publisher:** Bulacan PDRRMO (Provincial Disaster Risk Reduction and Management Office)
- **Type:** hydrology (tide schedule, dam levels, observed rainfall inc. Barangay Look 1st, flooding situation, river stations with alert/alarm/critical)
- **Timezone:** Asia/Manila — dates on page are Manila time; stored as UTC.
- **Expected update frequency:** Multiple times daily in wet season; daily health check minimum in dry season. `cadence_minutes=30` (configurable, 15m only if source supports).
- **Source-use/terms review:** **Pending.** Check published terms/notices, attribution expectations, and whether they restrict low-frequency automated retrieval. Record the actual finding in `source_registry.licensing_terms`. Written PDRRMO permission is needed only if published conditions are unclear/restrictive or BetterMalolos intends to claim an official partnership.
- **Robots:** **Pending manual verification.** Record the retrieved rule and verification time in `source_registry.robots_txt` before approval.
- **Terms reviewed at:** pending; seed data intentionally leaves `terms_reviewed_at` unset.
- **Responsible maintainer:** Bantay Baha ops — ops@bettermalolos.org (`maintainer_contact`)
- **Second-person mapping review:** pending — a named person within the BetterMalolos project/organization, other than the implementer, checks the station/field/unit/time mapping before any field is public (`second_reviewer`). This is not a request for a PDRRMO employee to review the code. If no second person is available yet, keep results internal.
- **Range policy:** rainfall 0–500 mm, dam 0–250 m, river −5–20 m, tide 0–10 m; flag `out_of_range` but never silently discard genuine extreme.
- **Parser version:** 1.0.0 (`PDRRMO_PARSER_VERSION`)
- **Fixtures:** `bantay_baha/tests/fixtures/pdrrmo/sample_2026-09-02.html` + `expected_2026-09-02.json`; additional `sample_flooding_populated.html` for flooding-rows case.
- **Source timestamp vs fetch time:** `observed_at` from table Date/Time columns (Manila → UTC); `fetched_at` from collector clock; both persisted on every `observation` and `source_snapshot`.
- **Freshness:** Scheduled hydrology 45m warn / 90m critical; daily dam/rainfall 30h/54h; tide 36h/72h.
- **Monitoring contact:** `maintainer_contact`. Automated alert delivery is not implemented in Phase A; operators must inspect source health until a tested transport is added.

**Enforcement:** seed data remains disabled and unapproved. Live internal collection requires `enabled=true`, `terms_reviewed_at`, `approved_at`, a completed source-use finding, and a non-pending robots record. Public publication additionally requires a named non-pending BetterMalolos `second_reviewer`. The current code enforces the older, stricter permission/reviewer gate and must be updated and tested before this revised policy is operational. Synthetic fixture collection remains available without approval. The environment cannot auto-approve the source.
