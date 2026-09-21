# BetterGov proof-of-concept snapshots

These files are intentionally outside the public page data flow during Phase 1. They prove the snapshot and review pattern with small fixtures and carry provenance fields. `scripts/bettergov/snapshot-pipeline.mjs --fixture` regenerates them without network access; omit `--fixture` to query the documented endpoints.

Do not move a snapshot into public page data until its review status is `reviewed` and a maintainer has checked its source, scope, release, units, and changes in `data/provenance/review-report.md`.
