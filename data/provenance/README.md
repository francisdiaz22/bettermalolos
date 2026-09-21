# BetterGov provenance

This directory stores generated metadata and maintainer review artifacts for external data snapshots. Public pages must not consume a snapshot until a maintainer has checked the source response and set its `review_status` to `reviewed`.

Every generated record must retain:

- source name and exact endpoint;
- query parameters and retrieval timestamp;
- source release or dataset identifier;
- unit/currency and scope note;
- checksum and review status.

Status vocabulary: `verified` means checked against an authoritative source; `reviewed` means a maintainer approved the snapshot for the stated scope; `pending-review` means not publishable; `source-unavailable` means the last approved snapshot is being shown while a refresh failed; `archived` means retained for history and not current.
