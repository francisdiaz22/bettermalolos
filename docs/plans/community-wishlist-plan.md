# BetterMalolos Community Wishlist

## Implementation Plan

The **Malolos Community Wishlist**, facilitated by BetterMalolos, is a positive civic-participation feature where Maloleños can propose constructive ideas for improving their city, support ideas from other residents, and help surface priorities that can be formally presented to the Malolos City Government and relevant barangay offices.

## Feature-branch status

This branch has completed the static prototype, governance documentation, and
the source-level MariaDB/read-API foundation. It has not deployed the Wishlist
schema or implemented public submissions, accounts, support, or moderation.

Completed on the feature branch:

- distinct `/community-wishlist/` public route, separate from `/ideas/`;
- responsive read-only prototype using `/data/community-wishlist.json`;
- category, barangay, and popularity/newest filters;
- prototype summary counts and resident-led/LGU disclaimer copy;
- Wishlist CSS and JavaScript assets;
- governance, moderation, privacy, methodology, lifecycle, LGU handoff, and
  operations/retention documents under `docs/community-wishlist/`;
- self-hosting and Hostinger integration decisions documented in this plan.
- additive, checksum-ledgered MariaDB migrations, a read-only Wishlist
  repository/API, and a frontend API fallback;

Still to implement:

- production migration rehearsal, backup verification, and deployment of the
  MySQL-backed Wishlist persistence and API;
- passwordless accounts, support, moderation, and resident account flows;
- production API-backed frontend, detail pages, and deployment verification.

Your Priorities is an inspiration reference only. We are building a focused,
BetterMalolos-owned Wishlist with a custom mobile-first interface and a
MySQL-compatible backend. We may adopt useful interaction patterns—idea-first
participation, constructive debate, support signals, lifecycle stages,
moderation, and transparent reporting—but we will not copy its code, branding,
database requirements, or visual design.

## Architecture and infrastructure boundary

The Wishlist is a separate application boundary from Bantay Baha, designed
for the current Hostinger infrastructure:

```text
bettermalolos.org/community-wishlist/
    └── BetterMalolos landing page and custom Wishlist frontend
         └── api.bettermalolos.org
              └── separate Wishlist routes/services
                   └── namespaced wishlist_* tables in Hostinger MySQL/MariaDB

api.bettermalolos.org
    └── Bantay Baha routes/services and existing tables
```

The public site and API remain separately deployable. Wishlist tables must be
namespaced, migrations must be additive, and Wishlist data must never reuse or
alter Bantay Baha tables. PostgreSQL, Redis, managed services, and an external
Your Priorities deployment are out of scope.

## Inspiration boundary

| Inspired pattern | BetterMalolos implementation |
| --- | --- |
| Idea-first civic participation | Constructive Malolos improvement proposals, separate from `/ideas/` product feedback |
| Support and prioritization | Verified-account support with transparent counts and published methodology |
| Constructive debate | Optional pro/con points with strict moderation; no attack threads |
| Lifecycle/status stages | Canonical statuses defined in this plan and `docs/community-wishlist/status-lifecycle.md` |
| Community moderation | Pre-publication review, moderation audit trail, and resident-facing explanations |
| Project/community organization | Categories, barangay context, and city-wide/local views designed for Malolos |

Do not copy Your Priorities branding, UI assets, source code, or user data. The
final implementation must feel native to BetterMalolos and clearly state that
it is resident-led and not an LGU system.

## MySQL-only implementation spike

Before enabling public submissions:

1. Define the minimal Wishlist schema and API boundary without modifying
   Bantay Baha tables.
2. Verify Hostinger MySQL version, database quota, Node application limits,
   cron behavior, SMTP, and persistent-storage behavior.
3. Implement MySQL-backed sessions and a leased job table for bounded Cron
   maintenance; do not introduce Redis or PostgreSQL dependencies.
4. Test submission, moderation, support, status transitions, account deletion,
   retention, backups, restore, and quota behavior.
5. Link the public submission flow only after the Phase 0 launch and privacy
   gates pass.

The prototype must remain read-only until the Phase 0 launch authority and
privacy gates are complete.


It is a community platform about Malolos—not a product-feedback channel for BetterMalolos.org. BetterMalolos operates the platform independently unless and until a written partnership says otherwise. It must never imply City endorsement, authority, funding, or approval before that exists.

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

City and barangay officers should be able to:

- see a concise, constructive, evidence-backed view of priorities relevant to their office
- understand the methodology, moderation rules, and limits behind each reported number
- verify the formal handoff record and respond through a documented channel
- distinguish resident support from an election, petition, procurement request, or official City commitment

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

It should make it easy for public servants to engage without creating an informal back channel: BetterMalolos records the office, method, date, reference, source document, and verified response for every formal handoff.

A useful moderation principle is:

> **Ideas, not attacks. Improvements, not accusations.**

## Legal and privacy posture

This is a product and operations plan, not legal advice. Before accepting public submissions, BetterMalolos should obtain Philippine legal/privacy review of the public terms, privacy notice, moderation policy, retention schedule, and incident-response process.

The plan is designed to support the data-minimization and transparency principles in the [Data Privacy Act of 2012 (R.A. 10173)](https://privacy.gov.ph/data-privacy-act/). It should also use strict pre-publication moderation because Section 4(c)(4) of the [Cybercrime Prevention Act of 2012 (R.A. 10175)](https://lawphil.net/statutes/repacts/ra2012/ra_10175_2012.html) covers libel committed through a computer system. The [Local Government Code of 1991 (R.A. 7160)](https://lawphil.net/statutes/repacts/ra1991/ra_7160_1991.html) recognizes roles and linkages for people's and non-governmental organizations; it is context for constructive engagement, not a claim that the City has endorsed or partnered with this platform.

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

Use one canonical status vocabulary in the database and API. The initial states are `pending_review`, `published`, `gathering_support`, `community_priority`, `prepared_for_lgu`, `forwarded_to_lgu`, `lgu_acknowledged`, `under_consideration`, `planned`, `implemented`, `not_pursued`, `rejected`, `archived`, and `duplicate`. `not_pursued` requires evidence and an explanatory public note; `archived` is only for duplicate, stale, or withdrawn wishes. Public labels may be friendlier, but the status key must not vary between the form, API, timeline, or moderation console.

---

# Phase 0: Governance, Officer Engagement, and Launch Authority

**Status: engineering preparation complete; operational launch gate pending.**

Before writing the backend, define the rules of the platform.

Recommended documentation:

```text
docs/community-wishlist/
├── README.md
├── moderation-policy.md
├── status-lifecycle.md
├── privacy-model.md
├── methodology.md
├── lgu-handoff.md
└── operations-and-retention.md
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
- the named platform owner, at least two moderators, an escalation contact, and the target review turnaround
- the published methodology for supporter counts, barangay representation, duplicates, and Community Priority designation
- the formal handoff protocol: intended LGU office, acceptable delivery methods, evidence retained, and who may record a response
- an explicit disclaimer that the platform is resident-led and that a status is not an LGU commitment without a verifiable source
- retention and deletion periods for contact data, abuse-prevention data, rejected submissions, and moderation records
- the 48-business-hour review target, with plain wording that it is a target rather than a guarantee
- that the private operational inbox for account and moderation messages, its SMTP credentials, and destination configuration live only in Hostinger environment variables, never in Git or public client code

## Required privacy notice and consent

Every account-registration and wish-submission screen must show a concise, linked privacy notice before personal data is sent. The notice states the data collected, purpose, recipients, retention, account rights/contact channel, and that the City receives only aggregate anonymous results unless a separate, explicit consent or lawful requirement applies.

Submission requires an unchecked affirmative checkbox: “I have read and agree to the Privacy Policy and understand that my submission will be reviewed before publication.” The API stores the policy version, consent timestamp, and consent wording version with the submission. Do not precheck it or treat account creation as blanket consent for unrelated use.

Collect only the email needed to verify and operate an account, an optional display name, an optional barangay, and the content needed for the wish. Do not collect full physical addresses, phone numbers, government IDs, precise map pins, demographic profiles, or sensitive personal information. Email addresses, account records, and raw submission contact data are never shared with LGU offices; reports use aggregate, anonymous figures only.

## Officer engagement before public launch

Before accepting public submissions, invite a small set of relevant City and barangay offices to a non-binding orientation. The purpose is to show the workflow, identify the correct receiving office for common categories, and agree on a reliable public contact channel. This is not approval for BetterMalolos to speak for the City.

Record only verifiable outcomes: a published office contact, a written acknowledgement, meeting minutes, or an official correspondence reference. Do not label an office as a partner, participant, or responder solely because an individual viewed, liked, or informally discussed an idea.

---

# Phase 1: Create a Distinct City Wishlist Prototype

**Status: complete as a read-only static prototype.**

Keep `/ideas/` as the existing BetterMalolos.org channel for product feedback, sources, volunteer offers, and proposed BetterMalolos tools. Do not mix those submissions with City improvement proposals.

Create a distinct, prominently linked public area for the resident-led City Wishlist. Cross-link the two areas with plain-language explanations of their different purposes.

Recommended public path:

```text
/community-wishlist/
```

## Hero Section

Example:

```text
Malolos Community Wishlist

What would make Malolos better?

Residents' constructive ideas for a better Malolos.
Explore community priorities, support an idea, or propose one.

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

The current implementation satisfies this phase with:

```text
community-wishlist/index.html
assets/css/community-wishlist.css
assets/js/community-wishlist.js
data/community-wishlist.json
```

It intentionally does not provide public submission, support, authentication,
moderation, detail routes, or database-backed counts yet.

---

# Phase 2: Shared MariaDB and Deployment Foundation

**Status: foundation migration, repository, read API, and frontend API fallback implemented; deployment pending.**

Implement the custom Wishlist backend as a separate module boundary within the
existing BetterMalolos Node Web App/API, using namespaced tables in the
existing Hostinger MariaDB database. Your Priorities is inspiration only and
must not be added as a runtime dependency or source checkout.

The existing Hostinger MariaDB database and Node app are already used by Bantay Baha. Wishlist work must be additive and independently reversible: no replacement SQL dump, no reuse of Bantay Baha tables, and no assumption that a health endpoint proves Wishlist migrations exist. Before writing a migration, reconcile the deployed Node revision with this repository, take a verified database backup, document quota headroom, and test the exact migration on a disposable MariaDB copy.

Wishlist routes/services must remain isolated from the existing Bantay Baha
routes/services. Keep migrations, repositories, authentication, moderation,
and maintenance code in the Wishlist module; do not alter Bantay Baha tables
or its existing contracts.

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
wishlist_submission_contact
wishlist_lgu_handoff
wishlist_account
wishlist_magic_link
wishlist_session
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
created_at
updated_at
published_at
```

Do not store submitter names or email addresses in `wishlist_items`, which is the broadly queried content table. Store optional name and required moderation contact in `wishlist_submission_contact`, with a one-to-one foreign key, encrypted-at-rest support where Hostinger provides it, access limited to moderators, and a documented retention/deletion job.

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
account_id
created_at
```

Verified accounts are required for submissions and support in the first public release. They use passwordless magic links; no password is collected, stored, or reset. Enforce `UNIQUE (wishlist_id, account_id)` so one verified account supports a wish once. Rate limiting and Turnstile remain required because account creation alone does not prevent abuse.

## `wishlist_account`, `wishlist_magic_link`, and `wishlist_session`

Store the smallest viable account record: opaque account ID, verified email, optional display name, optional barangay, public-identity preference, consent version/timestamp, created/verified/deleted timestamps, and account state. Store only a hash of each single-use magic-link token, its expiry, a short-lived salted abuse-prevention signal where needed, and its consumed/revoked timestamps. Expire unverified accounts and unused links after 24 hours; do not log tokens, email addresses, magic-link URLs, or raw IP addresses. Retain account contact data only while the account is active and for no more than 90 days after deletion or final resolution, unless a documented legal preservation obligation applies.

Public identity is opt-in per wish and per support. The default is anonymous. A user who opts in may expose only their chosen display name—never email, barangay, account ID, or support history.

Never publish account IDs, email addresses, private barangay information, or support history. Any short-lived abuse-prevention signal must be access-controlled, rotated, and kept separate from public data.

## Resident account area

Provide an authenticated `/community-wishlist/account/` area from the first public-write release. It lets a resident view their own submitted wishes, current public lifecycle status, public timeline entries, private receipt/reference ID, and wishes they have supported. It does not reveal internal moderator notes, reporter details, abuse-prevention data, unapproved edits, or another resident's activity.

For a pending, rejected, duplicate, archived, or `not_pursued` wish, show a plain-language resident-facing explanation where one is safe to share. Do not expose names of reviewers, internal deliberations, legal-risk assessments, or details about another person's submission. The account area is the primary place for a resident to check status; email notifications remain limited to account verification, submission receipt, and material status changes.

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

**Status: read-only API implemented and covered by Node tests; MariaDB deployment pending.**

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

**Status: not started; depends on Phase 0 launch authority and Phases 2–3.**

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

### Step 3: Verified account and consent

```text
Sign in with your verified email
Display name         Optional, not public by default

☐ I have read and agree to the Privacy Policy and understand
  that my submission will be reviewed before publication.
```

The verified email can be used for:

- moderation questions
- duplicate resolution
- notifying the submitter
- reducing abuse

Send a non-sensitive receipt containing the public Wish ID to the verified email. The email must not contain unpublished content or a login token.

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

**Status: not started; no public admin route exists on this branch.**

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

Moderation access is a distinct, least-privilege role. New moderators first express interest through the private operational inbox, are reviewed by the primary moderator, accept the moderation/privacy rules, and then receive only the in-app permissions needed to review content. They never receive Hostinger, database, deployment, SMTP, or source-control credentials. Every moderation action is audit logged and access can be revoked immediately.

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

## Anti-defamation moderation rule

The platform publishes proposals about services, infrastructure, places, and policies—not allegations about people. Reject or require a rewrite for names of private individuals, unverified accusations, attacks on public officials or employees, claims of criminality/corruption, calls to remove a named person, doxxing, or content that could reasonably identify a person through context. Direct emergencies and crime reports to the appropriate official channels rather than publishing them. Preserve the original privately only under the 90-day retention rule and do not republish it in a public explanation.

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

**Status: not started.**

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
/community-wishlist/more-shaded-waiting-sheds-near-bsu/
```

Simpler initial format:

```text
/community-wishlist/view/?id=BM-I-000142
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
/community-wishlist/barangay/tikay/
/community-wishlist/barangay/longos/
/community-wishlist/barangay/guinhawa/
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
/community-wishlist/success/
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

# Target Repository Structure

The following is the target structure after the backend phases are
implemented. The current branch has only the static prototype and governance
documents; do not create the future directories prematurely.

```text
bettermalolos/
│
├── community-wishlist/
│   ├── index.html
│   ├── submit/
│   │   └── index.html
│   └── view/
│       └── index.html
│
├── ideas/                         # BetterMalolos.org feedback and tool ideas
│   └── index.html
│
├── admin/
│   └── wishlist/
│       └── index.html
│
├── assets/
│   ├── css/
│   │   └── community-wishlist.css       # exists in prototype
│   └── js/
│       └── community-wishlist.js        # exists; static-data reader today
│
├── bantay_baha_node/
│   └── src/
│       ├── auth/                      # target shared account/session layer
│       ├── routes/wishlist.js         # target route registration
│       └── modules/wishlist/           # target Wishlist module
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
        ├── README.md                  # exists
        ├── privacy-model.md           # exists
        ├── moderation-policy.md       # exists
        ├── status-lifecycle.md       # exists
        ├── methodology.md             # exists
        ├── lgu-handoff.md             # exists
        └── operations-and-retention.md # exists
```

The backend directory can eventually be renamed once it clearly supports more than Bantay Baha.

That refactor should not be part of the initial Community Wishlist work.

---

# Target Public API

Keep the public API small.

```text
GET    /v1/wishlist
GET    /v1/wishlist/stats
GET    /v1/wishlist/categories
GET    /v1/wishlist/:publicIdOrSlug

POST   /v1/wishlist
POST   /v1/wishlist/:publicId/support
DELETE /v1/wishlist/:publicId/support
```

Administrative API:

```text
GET    /v1/wishlist/moderation/queue
GET    /v1/wishlist/moderation/:publicId
PATCH  /v1/wishlist/moderation/:publicId
POST   /v1/wishlist/moderation/:publicId/status
```

Avoid exposing generic public update endpoints.

Administrative routes are not an extension of the static `admin/` directory. Define and implement a real server-side authentication and authorization boundary before exposing them; until then, moderation remains an internal operational workflow and no admin route is deployed publicly.

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
006_create_wishlist_submission_contact.sql
007_create_wishlist_lgu_handoff.sql
```

Future migrations:

```text
008_add_notification_subscriptions.sql
009_add_support_context.sql
```

This makes deployments easier to reproduce and keeps the open-source repository easier to understand.

Use a migration ledger separate from Bantay Baha's Alembic version table (for example, `wishlist_schema_migration`). Every production migration requires: a timestamped backup, a disposable-database rehearsal, an explicit forward verification query, a documented rollback or compensating migration, and a post-deploy check against the running Wishlist API. Do not treat the existing Bantay Baha `/readiness` result as evidence that Wishlist tables are present.

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
- verified-email passwordless authentication, single-use token hashing, session revocation, and account-deletion handling
- moderation audit logs
- upload validation if images are later supported
- private handling of email addresses
- limited retention of unnecessary identifying information
- a verified, server-side Turnstile (or equivalent) decision before public writes are accepted
- a separate moderator role from deployment/database credentials

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
- registration, magic-link expiry, verified-session recovery, default anonymity, and explicit public-identity opt-in
- resident account visibility: own wish status and public timeline only; no internal notes or another person's activity
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
- account verification, session expiry/revocation, one-support-per-account enforcement, and consent-version recording

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

| Milestone | Deliverable                                                                                         | Branch status | Ship?        |
| --------- | --------------------------------------------------------------------------------------------------- | ------------- | ------------ |
| M0        | Governance and moderation rules                                                                     | Docs and launch register prepared; operational sign-off pending | Internal     |
| M1        | Static City Wishlist prototype under `/community-wishlist/`; `/ideas/` stays BetterMalolos feedback | Complete      | Yes          |
| M2        | MariaDB schema and migrations                                                                       | Implemented; deployment rehearsal pending | Internal     |
| M3        | Read-only Fastify API                                                                               | Implemented; MariaDB deployment pending | Internal     |
| M3A       | Verified-email passwordless accounts, mail delivery, sessions, and account privacy controls         | Not started   | Internal     |
| M4        | Production DB-backed idea browsing                                                                  | Not started   | Yes          |
| M5        | Authenticated idea submission and moderation                                                        | Not started   | Yes          |
| M6        | Verified-account Community Support                                                                  | Not started   | Yes          |
| M7        | Idea details, map and timeline                                                                      | Not started   | Yes          |
| M8        | Duplicate detection                                                                                 | Not started   | Yes          |
| M9        | Community Priority designation                                                                      | Not started   | Yes          |
| M10       | Barangay and category insights                                                                      | Not started   | Yes          |
| M11       | LGU forwarding workflow                                                                             | Not started   | Yes          |
| M12       | Quarterly Wishlist Report                                                                           | Not started   | Major Launch |
| M13       | Verified LGU responses                                                                              | Not started   | Later        |
| M14       | Success stories                                                                                     | Not started   | Later        |
| M15       | Analytics                                                                                           | Not started   | Later        |
| M16       | Notifications                                                                                       | Not started   | Later        |
| M17       | Optional identity features beyond the privacy-first account                                         | Not started   | Much Later   |

---

# Recommended MVP

Stop the first production implementation at **M6**.

The MVP is:

```text
Browse Ideas
+
Passwordless Accounts
+
Submit Idea
+
Moderation
+
Support Idea
+
MariaDB
```

## MVP launch gate

M6 may be released only when all of the following are demonstrably complete:

- Phase 0 documents are published and linked from the Wishlist.
- The live route, API version, database migration ledger, and deployed source revision are reconciled.
- A backup and disposable-MariaDB restore/migration rehearsal have succeeded.
- The public API exposes only published data; pending content, contact details, moderation notes, fingerprints, and precise sensitive locations cannot be retrieved.
- Submission, support, CAPTCHA verification, rate limiting, duplicate prevention, moderation, and status-transition tests pass against MariaDB.
- Passwordless email delivery works from Hostinger using a private operational inbox; magic links are single-use, expire after 24 hours, and are not logged.
- Residents can view the status of their own wishes and supports through the account area without exposing private moderation data or another resident's activity.
- The privacy notice, unchecked consent checkbox, consent-version audit record, 90-day retention/deletion workflow, and account-data access/deletion contact process have been manually tested.
- Moderation tests reject personal accusations, identifying information, and other content that violates the issues-not-people policy before anything is published.
- Moderators have an authenticated operational path, an escalation contact, and a documented service level.
- A pilot has been reviewed with representative residents and at least the intended receiving LGU/barangay office contacts.
- The first handoff report has a methodology, accountable sender, target office, delivery record, and public wording that does not overstate LGU participation.

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
