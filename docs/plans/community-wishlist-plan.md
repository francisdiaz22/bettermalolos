# BetterMalolos Community Wishlist

## Implementation Plan

The **BetterMalolos Community Wishlist** is a positive civic participation feature where Maloleños can propose constructive ideas for improving the city, support ideas from other residents, and help surface community priorities that can eventually be formally forwarded to the Malolos City Government and relevant barangay offices.

The goal is not to build another complaint board.

The goal is to create a credible civic pipeline:

```text
Maloleño
    ↓
Constructive Idea
    ↓
Community Support
    ↓
Community Priority
    ↓
Structured Evidence
    ↓
BetterMalolos Report
    ↓
Relevant LGU Office
    ↓
Response / Action
    ↓
Publicly Documented Outcome
```

---

# Product Vision

The public-facing feature should answer a simple question:

> **What would make Malolos better?**

Residents should be able to:

- discover ideas from fellow Maloleños
- suggest constructive improvements
- support ideas they believe in
- see which ideas are gaining community support
- follow the progress of major community priorities
- see which ideas have been forwarded to the LGU
- see official responses when available
- celebrate ideas that eventually become real improvements

Examples of suitable wishlist ideas:

- More shaded waiting sheds near schools
- Safer pedestrian crossings
- More trees and pocket parks
- Public bike racks
- More public trash bins
- Improved barangay health facilities
- Public Wi-Fi zones
- Better accessibility for senior citizens and persons with disabilities
- Weekend community markets
- Improved drainage in specific areas
- Additional street lighting
- Safer school zones

---

# Guiding Principles

The Community Wishlist should remain:

- constructive
- respectful
- non-partisan
- community-focused
- transparent
- easy to participate in
- privacy-conscious
- simple to maintain
- lightweight enough for the current Hostinger environment

The feature should avoid turning into a social network or public complaint board.

A useful moderation principle is:

> **Ideas, not attacks. Improvements, not accusations.**

---

# Proposed Public Lifecycle

Wishlist items should follow a clear lifecycle.

```text
Submitted
   ↓
Under Review
   ↓
Published
   ↓
Gathering Support
   ↓
Community Priority
   ↓
Forwarded to LGU
   ↓
LGU Acknowledged
   ↓
Planned / Under Consideration
   ↓
Implemented
```

Not every idea must reach every stage.

BetterMalolos must also avoid implying that forwarding an idea to the LGU means the idea has been officially approved.

---

# Phase 0: Governance and Rules

Before writing the backend, define the rules of the platform.

Recommended documentation:

```text
docs/community-wishlist/
├── README.md
├── moderation-policy.md
├── status-lifecycle.md
└── privacy-model.md
```

## Define acceptable submissions

Examples:

- More shaded waiting areas near schools
- Additional public bike racks
- More public trees
- Safer crossings
- Weekend public markets
- Better accessibility features
- Community parks
- Public drinking fountains

## Define unacceptable submissions

Examples:

- Personal accusations
- Political attacks
- Calls to fire specific individuals
- Defamation
- Commercial advertising
- Spam
- Law enforcement reports
- Immediate emergencies
- Individual disputes
- Content unrelated to Malolos

## Phase 0 Exit Criteria

Before implementation begins, define:

- what residents may submit
- what gets rejected
- what each status means
- what personal information is collected
- what information becomes public
- how BetterMalolos describes its relationship with the LGU
- how moderation decisions are handled

---

# Phase 1: Convert `/ideas/` Into the Wishlist Prototype

Use the existing BetterMalolos ideas area instead of creating an entirely separate application.

Recommended public path:

```text
/ideas/
```

## Hero Section

Example:

```text
Community Wishlist

What would make Malolos better?

Discover ideas from fellow Maloleños, support the ones
you believe in, or suggest something new.

[ Suggest an Idea ]   [ Explore Ideas ]
```

## Summary Section

Example:

```text
84 Ideas
2,413 Supporters
31 Barangays Represented
6 Community Priorities
```

## Initial Data Source

Before connecting MariaDB, prototype the frontend using static JSON.

```text
/data/community-wishlist.json
```

Example:

```json
[
  {
    "id": "BM-I-001",
    "title": "More shaded pedestrian areas near schools",
    "description": "Plant additional shade trees near major school routes.",
    "category": "environment",
    "barangay": "San Gabriel",
    "supportCount": 87,
    "status": "gathering_support"
  }
]
```

## Filters

Recommended filters:

```text
All
Most Supported
Newest
```

Categories:

```text
Transport & Mobility
Environment
Public Spaces
Health & Wellness
Education
Safety & Resilience
Digital Services
Livelihood
Accessibility
Culture & Heritage
Other
```

Barangay filtering should also be supported.

## Frontend Files

Recommended structure:

```text
assets/css/community-wishlist.css
assets/js/community-wishlist.js
```

Reuse the existing BetterMalolos design tokens and visual language.

Do not make Wishlist look like a separate product.

## Phase 1 Exit Criteria

The prototype should support:

- browsing ideas
- category filtering
- barangay filtering
- sorting
- responsive mobile layout
- accessibility
- useful empty states
- idea details
- zero backend dependency

---

# Phase 2: MariaDB Foundation

Introduce persistence only after the frontend experience is clear.

The existing Node/Fastify backend can be extended instead of creating a new service.

Recommended structure:

```text
bantay_baha_node/src/
├── modules/
│   └── wishlist/
│       ├── wishlist.routes.js
│       ├── wishlist.controller.js
│       ├── wishlist.service.js
│       ├── wishlist.repository.js
│       └── wishlist.schema.js
└── db/
    ├── pool.js
    └── migrations/
```

Do not rename or restructure the entire backend during the first Wishlist implementation.

That should be handled separately.

## Initial Tables

Start with:

```text
wishlist_items
wishlist_support
wishlist_categories
wishlist_status_history
wishlist_moderation
```

---

# Database Schema

## `wishlist_items`

Suggested fields:

```text
id
public_id
slug
title
description
category_id
barangay
location_description
latitude
longitude
beneficiary
impact_statement
status
support_count
submitted_name
submitted_email
created_at
updated_at
published_at
```

Use a public-facing ID separate from the database primary key.

Example:

```text
BM-I-000001
BM-I-000002
BM-I-000003
```

---

## `wishlist_categories`

Suggested fields:

```text
id
slug
name
icon
sort_order
is_active
```

Suggested initial categories:

```text
Environment
Transport & Mobility
Public Spaces
Health & Wellness
Education
Safety & Resilience
Digital Services
Livelihood
Accessibility
Culture & Heritage
Other
```

Do not hardcode categories into the frontend.

---

## `wishlist_support`

Suggested fields:

```text
id
wishlist_id
supporter_hash
barangay
created_at
```

Accounts should not be required for supporting an idea.

---

## `wishlist_status_history`

Suggested fields:

```text
id
wishlist_id
from_status
to_status
notes
reference_url
changed_at
```

This table allows BetterMalolos to maintain a public history.

Example:

```text
Nov 12
Submitted

Nov 14
Published by BetterMalolos

Dec 8
Reached 500 supporters

Jan 15
Included in Q4 Community Wishlist Report

Jan 21
Forwarded to City Engineering Office

Jan 25
Acknowledged by City Engineering Office
```

---

## `wishlist_moderation`

Suggested fields:

```text
id
wishlist_id
action
reason
moderator_notes
original_content
created_at
```

This provides accountability for moderation decisions.

---

# Phase 3: Read-Only API

Before enabling public submissions, expose the MariaDB content through a read-only API.

Recommended endpoints:

```text
GET /api/v1/wishlist
GET /api/v1/wishlist/:slug
GET /api/v1/wishlist/categories
GET /api/v1/wishlist/stats
```

Example query:

```text
GET /api/v1/wishlist?
    category=environment&
    barangay=San+Gabriel&
    sort=popular&
    page=1
```

Example response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 83
  }
}
```

Pagination should exist from the beginning.

Do not download the entire Wishlist database and perform all filtering in the browser.

## Statistics Endpoint

Example:

```json
{
  "ideas": 84,
  "supporters": 2413,
  "barangaysRepresented": 31,
  "communityPriorities": 6
}
```

## Phase 3 Exit Criteria

Production architecture becomes:

```text
Browser
   ↓
BetterMalolos Frontend
   ↓
Fastify API
   ↓
MariaDB
```

No public write operations yet.

---

# Phase 4: Suggest an Idea

Introduce the first write endpoint.

```text
POST /api/v1/wishlist
```

## Submission Flow

### Step 1: Idea

```text
What would make Malolos better?

Title
[ More covered waiting sheds ]

Tell us about your idea
[ ................................ ]
```

### Step 2: Community Context

```text
Category

Where would this help?

○ Whole City
○ Specific Barangay
○ Specific Location

Barangay
[ ........ ]

Who would benefit most?
[ Commuters ▼ ]

Why would this improve the community?
[ ................................. ]
```

### Step 3: Contact

```text
Your name            Optional
Email                Required, not public

☑ I understand that submissions are reviewed before
  appearing publicly.
```

The email can be used for:

- moderation questions
- duplicate resolution
- notifying the submitter
- reducing abuse

## Moderation First

New submissions should receive:

```text
status = pending_review
```

Response example:

```text
Thank you.

Your idea BM-I-000142 has been received
and will be reviewed before publication.
```

Never auto-publish submissions during the first release.

---

# Phase 5: Moderation Console

Extend the existing BetterMalolos admin area.

Recommended route:

```text
/admin/wishlist/
```

Recommended moderation queues:

```text
Pending
Published
Rejected
Archived
```

Example moderation card:

```text
BM-I-000142

More shaded waiting sheds near BSU

Category: Transport
Barangay: Guinhawa

[ Edit ]
[ Approve ]
[ Reject ]
[ Mark Duplicate ]
```

## Rejection Reasons

Suggested options:

```text
Duplicate
Complaint rather than proposal
Contains personal accusation
Advertising / spam
Outside Malolos
Insufficient information
Other
```

## Editorial Moderation

Moderators may improve wording for clarity without changing the intent.

Example original:

```text
lagay sana waiting shed dun lagi init mga nag aantay jeep
```

Published version:

```text
Additional covered waiting shed near XYZ
```

The original submission should remain available privately for auditability.

---

# Phase 6: Community Support

Introduce:

```text
POST /api/v1/wishlist/:id/support
```

Public interaction:

```text
♡ Support this idea

327 supporters
```

After supporting:

```text
♥ Supported

328 supporters
```

Use the word **Support** instead of:

- Vote
- Upvote
- Like

This is not an election or social network.

## Anonymous Support

Do not require accounts.

Possible approach:

```text
SHA256(
  rotating-secret +
  coarse-client-signal
)
```

Use this only as lightweight abuse prevention.

Also implement:

- rate limiting
- Cloudflare Turnstile or similar CAPTCHA
- server-side validation
- unique constraint on supporter hash + wishlist ID
- suspicious activity logging

Do not expose IP addresses publicly.

## Optional Support Context

After supporting, optionally ask:

```text
Why do you support this?

○ I live nearby
○ I work/study nearby
○ I frequently use this area
○ This benefits Malolos generally
○ Other
```

This data can improve future LGU reports.

---

# MVP Boundary

The first true production version should stop at Phase 6.

The MVP consists of:

```text
Browse Ideas
+
Submit Idea
+
Moderation
+
Support Idea
+
MariaDB
```

This is enough to validate whether residents will actually participate.

---

# Phase 7: Idea Detail Pages

Each idea should have its own page.

Preferred future format:

```text
/ideas/more-shaded-waiting-sheds-near-bsu/
```

Simpler initial format:

```text
/ideas/view/?id=BM-I-000142
```

Example detail page:

```text
Environment

More trees along Paseo del Congreso

San Gabriel • Submitted Sep 2026

[ 618 supporters ]

The Idea
...

Why it matters
...

Who benefits
Students • Commuters • Pedestrians

Suggested Location
[ Map ]

Community support
618 people

Status
⭐ Community Priority

Timeline
Sep 14    Submitted
Sep 16    Published
Oct 02    250 supporters
Nov 10    Community Priority
```

Reuse the existing Leaflet/OpenStreetMap integration when coordinates are available.

Do not require coordinates for city-wide ideas.

---

# Phase 8: Duplicate Detection

Start with deterministic duplicate detection.

When someone submits:

```text
More waiting sheds near BSU
```

search existing ideas using:

```text
title similarity
category
barangay
location
```

Then display:

```text
Similar ideas already exist:

Covered commuter waiting area near BSU
231 supporters

[ Support this instead ]

Still different?
[ Continue submitting ]
```

This prevents community support from being split across near-identical ideas.

AI-based semantic duplicate detection can be added much later.

---

# Phase 9: Community Priority Designation

Do not simply rank ideas by raw support count.

A high-population or highly online barangay could dominate the platform.

Useful indicators include:

```text
Support count
Barangay diversity
Sustained support
Impact breadth
Local relevance
```

Example:

```text
624 supporters
18 barangays represented
82% sustained support over 30 days
```

Possible starting rule:

```text
250+ supporters
AND
supporters from at least 5 barangays
```

For highly localized ideas:

```text
100+ supporters
for a barangay-specific proposal
```

The methodology should always be publicly documented.

---

# Phase 10: Barangay Views

Once enough data exists, introduce barangay-specific pages.

Example routes:

```text
/ideas/barangay/tikay/
/ideas/barangay/longos/
/ideas/barangay/guinhawa/
```

Example page:

```text
Tikay Community Wishlist

23 ideas
547 community supporters

Top priorities

1. Safer pedestrian crossing...
2. More street trees...
3. Public bike parking...

Categories

Transport       8
Environment     6
Public Space    4
```

This gives BetterMalolos a path toward engagement with barangay officials, not only City Hall.

---

# Phase 11: LGU Handoff Workflow

Introduce statuses such as:

```text
prepared_for_lgu
forwarded_to_lgu
acknowledged
under_consideration
planned
implemented
```

LGU-related statuses should require evidence.

Example:

```text
Forwarded to LGU

Date:
2026-12-15

Office:
City Engineering Office

Method:
Official email

Reference:
BM-CW-Q4-2026-017

Document:
Community Wishlist Q4 2026
```

Do not mark something as acknowledged because of an informal reaction on social media.

Maintain an audit trail.

---

# Phase 12: Quarterly Community Wishlist Report

This is the major civic milestone.

Example:

```text
BetterMalolos Community Wishlist
Q4 2026
```

## Community Participation

```text
143 ideas submitted
89 published
4,812 support actions
38 barangays represented
```

## Top City-Wide Priorities

```text
1. Safer pedestrian crossings
   843 supporters
   24 barangays represented

2. More trees and shaded public spaces
   721 supporters
   19 barangays represented

3. Covered commuter waiting areas
   615 supporters
   16 barangays represented
```

## Breakdown

Include:

- priorities by category
- priorities by barangay
- participation statistics
- support trends
- location maps where relevant
- methodology
- moderation policy summary
- LGU handoff references

Public actions:

```text
[ View Online ]
[ Download PDF ]
```

Potential recipients:

- Mayor's Office
- Sangguniang Panlungsod
- City Planning and Development Office
- City Engineering Office
- relevant barangay offices
- other appropriate LGU departments

This report is the bridge between the online platform and real civic participation.

---

# Phase 13: Verified LGU Responses

If LGU offices begin responding, BetterMalolos can publish their responses.

Example:

```text
Official Response

City Engineering Office
January 24, 2027

The office has acknowledged the proposed pedestrian
crossing and is currently evaluating the location.
```

Only show:

```text
✓ Verified LGU Response
```

when the source can be verified.

Do not build LGU user accounts initially.

Verified responses can be entered manually by BetterMalolos administrators.

---

# Phase 14: Success Stories

Create a positive archive of implemented ideas.

Recommended route:

```text
/ideas/success/
```

Example:

```text
✅ IMPLEMENTED

Additional pedestrian lighting near XYZ

436 community supporters

Proposed:
October 2026

Forwarded:
December 2026

Implemented:
May 2027

[ See the journey ]
```

Potential homepage summary:

```text
From ideas to improvements

12 community ideas implemented
7 currently planned
21 forwarded to relevant offices
```

This should become one of the strongest positive signals of the BetterMalolos project.

---

# Phase 15: Analytics

Only add analytics once meaningful participation exists.

Public analytics may include:

```text
Ideas by category
Ideas by barangay
Support over time
Top emerging priorities
Implemented ideas
LGU response rate
```

Admin analytics may include:

```text
Submission-to-publication rate
Duplicate rate
Spam rate
Average moderation time
Support actions per day
Unique supporters
Most engaged barangays
```

A particularly useful civic metric:

```text
Community → Government Conversion

Community Priorities: 24
Forwarded:            18
Acknowledged:          8
Planned:               4
Implemented:           2
```

Reuse the existing visualization stack instead of adding unnecessary dependencies.

---

# Phase 16: Notifications

Later, allow residents to follow an idea.

Example:

```text
Notify me about this idea
```

Email notifications are sufficient initially.

Useful events:

```text
Reached Community Priority
Forwarded to LGU
LGU Responded
Status Changed
Implemented
```

Avoid sending notifications for every new supporter.

---

# Phase 17: Optional User Identity

User accounts should be one of the last features added.

The platform does not initially need:

```text
usernames
passwords
avatars
followers
reputation points
badges
```

If identity becomes useful later, consider passwordless email magic links.

This could allow users to see:

```text
Ideas I Submitted
Ideas I Support
Updates
```

without maintaining traditional passwords.

---

# Proposed Repository Structure

```text
bettermalolos/
│
├── ideas/
│   ├── index.html
│   ├── submit/
│   │   └── index.html
│   └── view/
│       └── index.html
│
├── admin/
│   └── wishlist/
│       └── index.html
│
├── assets/
│   ├── css/
│   │   └── community-wishlist.css
│   │
│   └── js/
│       └── wishlist/
│           ├── api.js
│           ├── list.js
│           ├── detail.js
│           ├── submit.js
│           ├── support.js
│           └── filters.js
│
├── bantay_baha_node/
│   └── src/
│       ├── db/
│       │   ├── pool.js
│       │   └── migrations/
│       │
│       └── modules/
│           └── wishlist/
│               ├── wishlist.routes.js
│               ├── wishlist.controller.js
│               ├── wishlist.service.js
│               ├── wishlist.repository.js
│               ├── wishlist.schema.js
│               └── wishlist.constants.js
│
├── tests/
│   └── wishlist/
│       ├── wishlist-list.spec.js
│       ├── wishlist-submit.spec.js
│       ├── wishlist-support.spec.js
│       └── wishlist-accessibility.spec.js
│
└── docs/
    └── community-wishlist/
        ├── README.md
        ├── architecture.md
        ├── moderation-policy.md
        ├── privacy-model.md
        ├── status-lifecycle.md
        └── lgu-handoff.md
```

The backend directory can eventually be renamed once it clearly supports more than Bantay Baha.

That refactor should not be part of the initial Community Wishlist work.

---

# Proposed Public API

Keep the public API small.

```text
GET    /api/v1/wishlist
GET    /api/v1/wishlist/stats
GET    /api/v1/wishlist/categories
GET    /api/v1/wishlist/:id

POST   /api/v1/wishlist
POST   /api/v1/wishlist/:id/support
DELETE /api/v1/wishlist/:id/support
```

Administrative API:

```text
GET    /api/v1/admin/wishlist
PATCH  /api/v1/admin/wishlist/:id
POST   /api/v1/admin/wishlist/:id/publish
POST   /api/v1/admin/wishlist/:id/reject
POST   /api/v1/admin/wishlist/:id/status
```

Avoid exposing generic public update endpoints.

---

# Database Migrations

Use migration files instead of maintaining one large SQL dump.

Initial migrations:

```text
001_create_wishlist_categories.sql
002_create_wishlist_items.sql
003_create_wishlist_support.sql
004_create_wishlist_status_history.sql
005_create_wishlist_moderation.sql
```

Future migrations:

```text
006_add_lgu_handoff.sql
007_add_notification_subscriptions.sql
008_add_support_context.sql
```

This makes deployments easier to reproduce and keeps the open-source repository easier to understand.

---

# Security and Abuse Prevention

The feature should include:

- strict server-side validation
- prepared SQL statements
- rate limiting
- CAPTCHA or Cloudflare Turnstile
- duplicate support prevention
- input length limits
- HTML escaping
- CSRF protection where relevant
- admin authentication
- moderation audit logs
- upload validation if images are later supported
- private handling of email addresses
- limited retention of unnecessary identifying information

Avoid exposing private submission metadata publicly.

---

# Testing Strategy

## Frontend

Test:

- idea listing
- filters
- sorting
- empty states
- detail pages
- submission form
- validation
- support interaction
- responsive behavior
- accessibility

## API

Test:

- pagination
- filtering
- sorting
- validation
- moderation rules
- duplicate support prevention
- status transitions
- malformed requests
- authorization

## Database

Test:

- migrations
- indexes
- foreign keys
- uniqueness constraints
- rollback strategy
- support count consistency

## End-to-End

Recommended flows:

```text
Resident submits idea
→ Admin approves idea
→ Idea becomes public
→ Resident supports idea
→ Support count increases
```

Also test:

```text
Duplicate idea submitted
→ Existing idea suggested
```

and:

```text
Admin marks idea forwarded to LGU
→ Public timeline updates
```

---

# Features Deliberately Excluded From V1

Do not include the following in the first implementation:

```text
❌ User accounts
❌ Public comments
❌ AI chatbot
❌ AI moderation
❌ Vector database
❌ Live chat
❌ Reputation points
❌ Gamification badges
❌ Social following
❌ Complex ranking algorithms
❌ Native mobile app
❌ React rewrite
❌ Separate microservice
❌ Redis
❌ WebSockets
```

BetterMalolos should remain lightweight and easy to host and maintain.

---

# Implementation Milestones

| Milestone | Deliverable | Ship? |
|---|---|---|
| M0 | Governance and moderation rules | Internal |
| M1 | Static Wishlist redesign under `/ideas/` | Yes |
| M2 | MariaDB schema and migrations | Internal |
| M3 | Read-only Fastify API | Internal |
| M4 | Production DB-backed idea browsing | Yes |
| M5 | Idea submission and moderation | Yes |
| M6 | Community Support | Yes |
| M7 | Idea details, map and timeline | Yes |
| M8 | Duplicate detection | Yes |
| M9 | Community Priority designation | Yes |
| M10 | Barangay and category insights | Yes |
| M11 | LGU forwarding workflow | Yes |
| M12 | Quarterly Wishlist Report | Major Launch |
| M13 | Verified LGU responses | Later |
| M14 | Success stories | Later |
| M15 | Analytics | Later |
| M16 | Notifications | Later |
| M17 | Optional user identity | Much Later |

---

# Recommended MVP

Stop the first production implementation at **M6**.

The MVP is:

```text
Browse Ideas
+
Submit Idea
+
Moderation
+
Support Idea
+
MariaDB
```

This is enough to validate actual community interest before investing heavily in additional features.

---

# First Major Civic Milestone

The most important milestone is not a technical feature.

It is:

> **BetterMalolos publishes its first Community Wishlist Report and formally forwards the community's top priorities to the appropriate Malolos LGU offices.**

That should be considered the first major success of the project.

---

# Long-Term Goal

The Community Wishlist should evolve from a simple idea board into a structured civic participation platform that helps residents communicate constructive priorities while giving the LGU a clearer view of what communities want.

The product should optimize for this flow:

```text
Maloleño
    ↓
Constructive Idea
    ↓
Community Support
    ↓
Community Priority
    ↓
Structured Evidence
    ↓
BetterMalolos Report
    ↓
Relevant LGU Office
    ↓
Response / Action
    ↓
Publicly Documented Outcome
```

The measure of success is not the number of features built.

The measure of success is whether BetterMalolos can help turn community ideas into visible, documented improvements for Malolos.
