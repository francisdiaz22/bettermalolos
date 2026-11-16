# FY2027 BetterGov snapshot — human review packet

**Snapshot:** `hgab-2027-20261116072742`

**Collected:** 2026-11-16T07:27:42.147Z (2026-11-16 15:27:42 Asia/Manila)

**Source release:** `a0caa778442cdae5583f5a006ea7401dab00e5ac` (API build 2026-10-26T08:46:14.383Z)

**Review status:** `reviewed`

**Reviewer:** Codex, performing the maintainer review at the user's request

**Reviewed:** 2026-11-16 (Asia/Manila)

## Collection and record checks

- The API overview and all 25 configured searches were collected. Each query's `data.total` matched received rows and unique IDs; all fit in one `limit=200&offset=0` page. The 75 district-lens DPWH project-detail records were also retrieved individually.
- Amounts declare PHP pesos. Snapshot rows retain source values and nulls. The 75 benchmark records have HTTPS BetterGov project links and source PDF page links. Their normalized IDs are unique and dataset-qualified as `dpwh:{source id}`.
- API source commit, build time, query parameters, totals, source links, notices, disclaimers, and source project rows are retained in the snapshot. Ledger schema and build/source/lens commits are recorded alongside the district scope.
- Source amounts were checked against the pinned ledger totals and exact project-ID list. This review does not independently re-transcribe every amount from the underlying budget PDFs; all null amounts remain unknown.

## BetterGov location-lens source and method

The benchmark source is [`locations.json`](https://budget-assets.bettergov.ph/hgab/2027/locations.json), schema 2, built `2026-11-03T15:37:22.239Z`. It names source commit `a0caa778442cdae5583f5a006ea7401dab00e5ac` and location-lens commit `d76863a917cb11e25a0a37776f35b024dbc9cc48`. The selected district key is `leg:bulacan:1st`.

The pinned [location-lens methodology](https://github.com/csiiiv/DPWH-NEP-HB-2027-ANALYSIS/blob/d76863a917cb11e25a0a37776f35b024dbc9cc48/analysis/docs/location_district_lens_method.md) resolves one linked DPWH project once. It selects clean funded-section title PSGC evidence when supported by a usable DEO, coordinate, direct title context, or reviewed named site (`title_psgc`); otherwise it uses unique DEO-to-district mapping, the intact shared DEO, region, or unassigned. All 75 Bulacan 1st rows are `title_psgc`. Locations are provisional title evidence, not surveyed sites. They do not show that a representative requested, sponsored, or controlled a project or amount.

This location lens is not the `/api/v1/hgab/2027/districts/leg%3Abulacan%3A1st` office-association record. The API record associates whole engineering-office totals with districts the office serves; it does not reproduce the 75-row title-location assignment or split an office budget into district project amounts.

## Bulacan 1st District reconciliation

| DPWH set | Rows | 2027 NEP | House Bill 10858 | Net change |
| --- | ---: | ---: | ---: | ---: |
| BetterGov legislative location lens | 75 | ₱1,495,230,000 | ₱3,180,834,000 | +₱1,685,604,000 |
| Shared with prior repo DEO/title scope | 57 | ₱840,230,000 | ₱860,230,000 | +₱20,000,000 |
| Ledger-only rows added to the scope | 18 | ₱655,000,000 | ₱2,320,604,000 | +₱1,665,604,000 |
| Repo-only rows excluded from the benchmark | 4 | ₱105,000,000 | ₱155,000,000 | +₱50,000,000 |

Every one of the 75 qualified IDs, project titles, nullable amounts, source details, and location assignments is retained in `data/bettergov/bulacan-first-district-location-lens.json`. Its `reconciliation.ledger_only.projects` lists all 18 missing rows and its `reconciliation.repo_only.projects` lists all four extra rows. The four excluded IDs are `dpwh:house-reading:1518`, `dpwh:house-reading:7540`, `dpwh:house-reading:7547`, and `dpwh:house-reading:2669`. They are outside this location lens; their exclusion is not a claim that their source project lines are invalid.

The refreshed snapshot contains 75 DPWH rows plus two separate FMR rows. FMR totals are ₱30,000,000 NEP and ₱30,000,000 House. HFEP and NIA have no 1st District search matches. None of these non-DPWH records is included in the 75-row benchmark.

The 75 DPWH source rows contain 15 null NEP amounts and 3 null House amounts. These were preserved as `null`. The aggregate sums match the ledger because stated values are summed per version; unknown values are not rewritten as zero on project rows.

## Other scopes and exclusions

| View | Rows | 2027 NEP | House Bill 10858 |
| --- | ---: | ---: | ---: |
| Bulacan Province | 421 | ₱6,683,538,000 (371 stated rows) | ₱7,112,738,000 (399 stated rows) |
| Bulacan 1st District DPWH benchmark | 75 | ₱1,495,230,000 | ₱3,180,834,000 |
| Bulacan 1st District other programs | 2 FMR | ₱30,000,000 | ₱30,000,000 |
| Malolos City | 25 | ₱504,000,000 (22 stated rows) | ₱722,600,000 (25 stated rows) |

The 1st District FMR query excludes `fmr:house_only:ib:p697:r2`, “Concreting of Brgy. Calumpit FMR, Brgy. Calumpit, Lobo, Batangas” (House-only ₱5,000,000). The province FMR search excludes `fmr:house_only:ib:p696:r16`, a namesake project in Mabini, Batangas. Malolos excludes the two DPWH search matches `dpwh:house-reading:7772` and `dpwh:house-reading:7763` because those titles place work in Calumpit, Bulacan. The exclusions and reasons are implemented in `scripts/bettergov/hgab-2027-contract.mjs`; raw query rows and totals remain in provenance.

These are scoped records, not complete physical-location inventories. A DPWH project can span places, and title place extraction is provisional. The BetterGov source is independent and unofficial. Figures describe budget documents, not actual spending, project completion, or Malolos LGU appropriations. One-version-only rows are candidates for review, not conclusive insertions or deletions.

## Review decision

- Source metadata, query completeness, dataset-qualified project IDs, exact location-lens totals, nullable amount handling, source links, scope separation, and the documented exclusions were checked.
- The district page labels the DPWH lens, shows exact NEP and House totals and net change, separates FMR/HFEP/NIA totals, and states that location assignment does not establish representative control or sponsorship.
- **Publication decision:** approved for the reviewed scopes above. This approval does not assert that each project was physically surveyed inside a municipality or independently verify every source-PDF transcription.
