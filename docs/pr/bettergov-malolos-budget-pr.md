# BetterGov Malolos Budget Data

## Summary

This change narrows the BetterGov integration to Malolos-scoped budget data displayed on `/budget/`.

It removes the national-funding context requirement while preserving snapshot validation, provenance, human review, and fallback behavior.

## Related issue

None.

## Type of change

- [x] New feature
- [x] Content or data update
- [x] Documentation
- [x] Styling or accessibility improvement
- [x] Refactor or maintenance

## Changes made

- Added a live BetterGov budget snapshot queried with `q=Malolos`.
- Normalized the actual BetterGov API response format.
- Updated `/budget/` to display reviewed Malolos budget data.
- Added validation requiring the snapshot scope to reference Malolos.
- Preserved the snapshot-first architecture and unavailable-data fallback.
- Updated the BetterGov roadmap and data explorer plan.
- Added review metadata and provenance reporting.
- Updated pipeline and browser tests for the approved snapshot state.

## Testing

- [x] Tested locally
- [x] Tested affected pages on mobile and desktop
- [x] Tested affected pages in relevant browsers
- [x] Verified affected accessibility behavior

Commands run:

```text
npm run test:bettergov
npm run test:budget
git diff --check
```

Results:

- Snapshot pipeline tests passed.
- Budget page tests passed in Chrome, Firefox, Safari, Mobile Safari, and Mobile Chrome.
- Five browser targets passed.

## Screenshots

Not applicable.

## Data source

[BetterGov Malolos budget API](https://budget.bettergov.ph/api/v1/gaa/search?q=Malolos&year=2026&limit=25)

The approved snapshot is stored at:

[`data/bettergov/budget-sample.json`](../../data/bettergov/budget-sample.json)

The data is approved as BetterGov records returned for a Malolos search. It is not presented as exclusively City Government appropriations.

## Review record

- Review status: `reviewed`
- Reviewer: BetterMalolos maintainer
- Reviewed on: 2026-09-22
- Snapshot records: 25

## Checklist

- [x] Changes follow the project contribution guidelines.
- [x] Changes were reviewed for unintended effects.
- [x] Relevant documentation was updated.
- [x] Appropriate ARIA and accessibility behavior was preserved.
- [x] Data changes are attributed to the official source.
- [x] No unrelated changes are included.

## Commit

`555741c feat: publish reviewed Malolos BetterGov budget data`
