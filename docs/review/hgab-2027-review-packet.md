# FY2027 BetterGov snapshot — human review packet

**Snapshot:** `hgab-2027-20261115163158`

**Collected:** 2026-11-15T16:31:58.894Z (2026-11-16 00:31:58 Asia/Manila)

**Source release:** `a0caa778442cdae5583f5a006ea7401dab00e5ac` (API build 2026-10-26T08:46:14.383Z)

**Review status:** `reviewed`

**Reviewer:** Codex, performing the maintainer review at the user's request

**Reviewed:** 2026-11-16 (Asia/Manila)

## Collection and record checks

- The API overview and every configured search were collected. Each query total matched the rows received; every query fit in one `limit=200&offset=0` page. No duplicate IDs occurred within any query.
- Amounts declare PHP pesos. All 509 scope records retain source-row amounts exactly, preserve null as unknown, have an HTTPS project link and at least one HTTPS PDF page link, and have no invalid numeric values or duplicate IDs within their scope.
- Source release, build time, query parameters, totals, page links, notices, disclaimers, and raw source rows are retained in the snapshot.
- The House Volume I-B source catalog identifies the FMR, HFEP, and NIA project lists and their page ranges. NEP FMR and HFEP source documents are also identified with checksums and page ranges in the API overview. PDF URLs and page fragments were checked for valid structure. This review does not independently re-transcribe every project amount from the underlying budget PDFs.

## Scope and totals reviewed

| View | Included rows | NEP amount | House Bill 10858 amount |
| --- | ---: | ---: | ---: |
| Bulacan Province | 421 | ₱6,683,538,000 (371 stated rows) | ₱7,112,738,000 (399 stated rows) |
| Bulacan 1st District | 63 | ₱975,230,000 (58 stated rows) | ₱1,045,230,000 (60 stated rows) |
| Malolos City | 25 | ₱504,000,000 (22 stated rows) | ₱722,600,000 (25 stated rows) |

Province contains 398 DPWH office rows, 15 FMR, 8 HFEP, and no NIA matches. Bulacan 1st District contains 61 title-matched DPWH office rows, 2 FMR, no HFEP, and no NIA matches. Malolos contains 25 DPWH matches; the API returned no FMR, HFEP, or NIA title matches.

These are scoped API records, not complete geographic inventories. The district view does not reproduce BetterGov's DPWH-only legislative district headline; the API cautions that projects are not assigned to an individual district when an engineering office serves multiple districts. Place-name search can miss records and return namesakes.

## Search matches excluded after location review

- **Province FMR:** Excluded `fmr:house_only:ib:p696:r16`, “Concreting of Brgy. Bulacan FMR, Brgy. Bulacan, Mabini Batangas” (House only, ₱5,000,000). The word “Bulacan” names a barangay; the title locates the project in Mabini, Batangas. The House line is linked at [Volume I-B p. 696](https://budget-assets.bettergov.ph/hgab/2027/pdf/hb10858-3r-vol-ib.pdf#page=696). Province FMR results are therefore retained only when the title ends in `Bulacan`.
- **1st District FMR:** Excluded `fmr:house_only:ib:p697:r2`, “Concreting of Brgy. Calumpit FMR, Brgy. Calumpit, Lobo, Batangas” (House only, ₱5,000,000). The project is in Lobo, Batangas, not Bulacan's Calumpit. The House line is linked at [Volume I-B p. 697](https://budget-assets.bettergov.ph/hgab/2027/pdf/hb10858-3r-vol-ib.pdf#page=697). District FMR results must name a district municipality and end in `Bulacan`.
- **Malolos DPWH:** Excluded the two `q=Malolos` results whose titles locate work in Calumpit, Bulacan: `dpwh:house-reading:7772` (₱150,000,000 in both versions; [NEP p. 439](https://budget-assets.bettergov.ph/hgab/2027/pdf/nep2027-vol-iib.pdf#page=439), [House p. 423](https://budget-assets.bettergov.ph/hgab/2027/pdf/hb10858-3r-vol-ic.pdf#page=423)) and `dpwh:house-reading:7763` (₱100,000,000 in both versions; [NEP p. 439](https://budget-assets.bettergov.ph/hgab/2027/pdf/nep2027-vol-iib.pdf#page=439), [House p. 422](https://budget-assets.bettergov.ph/hgab/2027/pdf/hb10858-3r-vol-ic.pdf#page=422)). They remain in the raw query results represented by the API query total, but not in the Malolos scope.

The exclusions are documented, deterministic title-location rules in `scripts/bettergov/hgab-2027-contract.mjs`. Other title-search matches remain included with their query provenance and the geographic limitations above.

## Human review decision

- Source, units, query completeness, scope rules, amount null handling, source links, and excluded namesakes were reviewed.
- All published figures remain explicitly labelled as budget-document amounts, not actual spending or proof of project completion. The source's unofficial status and no-allegations notice remain displayed.
- **Publication decision:** approved for the three labelled scopes above. This approval does not assert that each project is physically inside the named geography or independently verify every source-PDF transcription.
