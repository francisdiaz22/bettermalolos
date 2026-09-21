# Status lifecycle

Status keys are canonical in the database, API, timeline, and moderation console:

`pending_review`, `published`, `gathering_support`, `community_priority`, `prepared_for_lgu`, `forwarded_to_lgu`, `lgu_acknowledged`, `under_consideration`, `planned`, `implemented`, `not_pursued`, `rejected`, `archived`, `duplicate`.

Public labels may be friendlier, but must map to these keys. `not_pursued` requires evidence and a public explanatory note. `archived` is reserved for duplicate, stale, or withdrawn wishes. A forwarded or acknowledged status is not an LGU approval, funding commitment, or implementation promise.

