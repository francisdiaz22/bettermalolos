# FY2027 BetterGov snapshot — human review packet

**Snapshot:** `hgab-2027-20261031170711`  
**Collected:** 2026-10-31T17:07:11.810Z  
**Source release:** `a0caa778442cdae5583f5a006ea7401dab00e5ac` (API build 2026-10-26T08:46:14.383Z)  
**Review status:** `reviewed`  
**Reviewer:** BetterMalolos maintainer (user-confirmed)  
**Reviewed:** 2026-11-07T07:26:38Z

## What the automated checks establish

- The overview and all seven unique configured query results were collected; each request used `limit=200&offset=0`, and received counts matched API totals: 152, 191, 55, 27, 0, 0, and 0.
- The three Bulacan office queries yield 398 distinct DPWH rows. Province contains no title-search additions.
- Malolos is the documented union of Bulacan 1st DEO assignment (152 rows) and four title searches (27 DPWH, 0 FMR, 0 HFEP, 0 NIA); after deduplication it has 160 rows, including 19 overlaps retaining both reasons.
- The fetched scope arrays contain no null-to-zero conversion. A null amount is retained as unknown. Every row has a project link and at least one source PDF page link; amount fields match the retained API source row.
- Province has 66 records and Malolos has 18 records with at least one null among the NEP/latest-House amount fields. These are source-state cases, not failed collection checks.

These checks validate collection and transformation against the API response. They do not independently prove the API's PDF transcription, geographic correctness, or whether any project belongs physically within a city boundary.

## Human review decision

- The maintainer confirmed the human review is complete and approved the configured Province and Malolos scope definitions.
- The Calumpit/spanning title matches are retained under the existing Malolos title-search rule. Their title-match inclusion reason and the limitation that title searches are not a city-boundary inventory remain disclosed. No manual exclusions were made.
- Null values remain unknown; one-version-only rows remain candidates for further review. Source notices and the portal interpretation notice remain part of the publication contract.
- This record logs the maintainer's approval; it does not claim an independent geospatial verification or transcribe individual PDF spot-check results.

## Deliberate scope edge cases

The following title-search matches are included because the API returned them for `q=Malolos`; their titles place the described works in Calumpit, not Malolos. Do not silently remove them. Either retain them with the existing title-match reason and location-limit disclosure, or record a reviewer-approved exclusion in the scope data and About page before publication.

| API project | Title | Amount status | Source pages |
| --- | --- | --- | --- |
| `dpwh:house-reading:7772` | Rehabilitation of Malolos - Paombong - Hagonoy - Calumpit Road, Sta. 0+000 - Sta. 2+800, Calumpit, Bulacan | PHP 150,000,000 in NEP and House | [NEP p. 439](https://budget-assets.bettergov.ph/hgab/2027/pdf/nep2027-vol-iib.pdf#page=439), [House p. 423](https://budget-assets.bettergov.ph/hgab/2027/pdf/hb10858-3r-vol-ic.pdf#page=423) |
| `dpwh:house-reading:7763` | Improvement of Malolos Paombong Hagonoy Calumpit Road, Municipality of Calumpit, Bulacan | PHP 100,000,000 in NEP and House | [NEP p. 439](https://budget-assets.bettergov.ph/hgab/2027/pdf/nep2027-vol-iib.pdf#page=439), [House p. 422](https://budget-assets.bettergov.ph/hgab/2027/pdf/hb10858-3r-vol-ic.pdf#page=422) |

The same title-query result set also includes records explicitly naming Malolos, for example:

- `dpwh:house-reading:4095` — Retarding Basin along Sampaguita Road, Barangay Santo Rosario, City of Malolos; House-only, PHP 132,000,000; [House p. 303](https://budget-assets.bettergov.ph/hgab/2027/pdf/hb10858-3r-vol-ic.pdf#page=303).
- `dpwh:house-reading:12403` — Evacuation Center at Barangay Mojon, City of Malolos; PHP 70,000,000 in both versions; [NEP p. 563](https://budget-assets.bettergov.ph/hgab/2027/pdf/nep2027-vol-iib.pdf#page=563), [House p. 637](https://budget-assets.bettergov.ph/hgab/2027/pdf/hb10858-3r-vol-ic.pdf#page=637).

## Reviewer decision record

- Primary reviewer: **BetterMalolos maintainer (user-confirmed)**
- Review date: **2026-11-07 (Asia/Manila)**
- Scope definitions: **accepted**
- Calumpit/spanning title matches: **retained with disclosure**
- Manual exclusions: **none**
- Publication decision: **approved**

The snapshot records the review timestamp and decision in `data/bettergov/hgab-2027.json`.
