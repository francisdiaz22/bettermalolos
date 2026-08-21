# BetterMalolos v1.0.3 — Implementation Plan

> Companion to [the v1.0.3 product direction](betterMalolos_version_1.0.3.md). This is an implementation checklist for an agent working one phase at a time.

## Release outcome

Ship a community-first homepage and a safe, usable `/ideas` intake page. A visitor must quickly understand that BetterMalolos is an independent, community-built civic platform; be able to discover the eight project priorities; and be able to suggest an idea or volunteer.

This release **does not** claim that Bantay Baha, RoadWatch, Tubig Malolos, or the other proposed tools are live. They are represented only as accurately labelled roadmap/tool cards unless an independently verified implementation is already available.

## Delivery strategy and constraints

- Implement the static site at the repository root first, because the current production branch is the static HTML version. Do not silently implement only `react-app/`.
- Preserve existing service, government, transparency, accessibility, PWA, and language-switching functionality.
- Reuse the global colour tokens in `assets/css/style.css`; do not introduce one-off brand colours.
- Keep the release fully useful without a backend. A real submission endpoint is a release gate, not something a client-side page can safely fake.
- Do not add factual project, flood, traffic, water, or barangay claims without a source and last-verified date.
- Existing uncommitted files are outside this work unless specifically named below.

## Scope map

| Area              | v1.0.3 deliverable                                                                                               | Deferred                                                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Homepage          | Community-first order, new hero, tool cards, barangay/project teasers, services lower on page, contribution CTAs | Live operational data tools                                                             |
| Community roadmap | Static/data-driven eight-item roadmap with status badges                                                         | Voting, supporter counts, public moderation workflow                                    |
| Ideas portal      | Accessible form, privacy notice, explicit submission handling, success/error states                              | Public idea listings, attachments unless endpoint supports secure scanning/storage      |
| Navigation        | Resident-focused labels and only routes that resolve                                                             | Empty future pages and broad whole-site navigation migration unless separately approved |
| Data              | Small, versioned local JSON for roadmap display                                                                  | Unverified community reports and third-party feeds                                      |

## Required decisions before implementation begins

Complete these before Phase 3 or before exposing a live submission form. Do not make a guess that changes how residents' personal data is handled.

- [ ] Confirm the production submission service for `/ideas` (for example, a managed form provider, serverless endpoint, or a reviewed email workflow).
- [ ] Confirm who receives submissions and the expected response/moderation process.
- [ ] Confirm whether attachments are in scope. Default to **no attachments** for v1.0.3.
- [ ] Confirm the legal wording owner for the privacy notice and retention period.
- [ ] Confirm the intended `/volunteer` destination. The current volunteer modal may be retained as the destination until a dedicated route exists.
- [ ] Confirm whether the navigation redesign is homepage-only for this release or must be propagated to every static page. Default: homepage header plus valid existing destinations only.

If any decision is unavailable, implement all display work but leave the form unsubmitted and clearly label it as awaiting a submission channel. Never show a false success message.

## Phase 0 — Baseline and implementation contract

**Goal:** establish a clean, observable starting point and lock the release boundaries.

### Tasks

- [ ] Read `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `docs/detected_vulnerabilities.md`, and the product-direction document.
- [ ] Inspect `index.html`, `assets/css/style.css`, `assets/css/responsive.css`, `assets/js/main.js`, `assets/js/translations.js`, `sitemap.xml`, `sw.js`, and the current Playwright configuration.
- [ ] Record the current homepage desktop and mobile screenshots for visual comparison.
- [ ] Run `npm run format:check` and the relevant existing Playwright suite; record failures that pre-date this work.
- [ ] Create a feature branch using the repository convention, such as `feature/community-first-homepage`.
- [ ] Create a short implementation log in the PR description: phase, files touched, behaviour changed, tests run, known follow-ups.

### Exit criteria

- [ ] The implementer can identify the current homepage sections, header/mobile-menu behaviour, translation mechanism, and build process.
- [ ] The team has explicitly selected an ideas-submission transport or recorded that the form cannot go live yet.
- [ ] No source-data or live-tool claim has been added to the release scope.

## Phase 1 — Content model, routes, and reusable status UI

**Goal:** create the smallest data model required to render the roadmap consistently and make future tools honest about maturity.

### Tasks

- [x] Add `data/community-tools.json` with exactly these items in this order: Bantay Baha, RoadWatch, Saan Ako Lalapit?, Tubig Malolos, Barangay Hub, Project Tracker, Commute Guide, Opportunities Hub.
- [x] Give each item a stable `id`, `name`, `route`, one-sentence resident benefit, `status`, `priority`, and optional `availabilityNote`.
- [x] Start all not-yet-built tools at `Proposed` (or `Researching` only when evidence supports it). Never use `Live` for a card with no working tool.
- [x] Define the allowed statuses once: `Proposed`, `Researching`, `In Development`, `Beta`, `Live`.
- [x] Add a reusable badge/card CSS pattern with text labels in addition to colour. Ensure status contrast meets WCAG AA.
- [x] Decide whether cards with unavailable routes are non-link cards or link to `/ideas` with a contextual “help shape this” CTA. Do not create dead links.
- [x] Add a small renderer in a dedicated JavaScript file (for example `assets/js/community-tools.js`) rather than duplicating eight cards across the homepage and `/ideas`.
- [x] Add English and Filipino translation keys for all new visible UI, including statuses, section titles, labels, errors, and success messages.

### Data contract

```json
{
  "id": "bantay-baha",
  "priority": 1,
  "name": "Bantay Baha",
  "route": "/bantay-baha",
  "summary": "Flood conditions, evacuation information, passable roads, and flood-control projects.",
  "status": "Proposed",
  "availabilityNote": "Help us research and build this tool."
}
```

### Exit criteria

- [x] The JSON validates and preserves the required order without relying on display text sorting.
- [x] Status rendering has a visible text label, keyboard focus is clear, and no unavailable link returns a 404.
- [x] New content is available in both supported languages.

## Phase 2 — Homepage information architecture and hero

**Goal:** reshape the homepage around resident needs without removing useful service content.

### Required order

1. Hero
2. Top citizen tools
3. Suggest an idea/community input
4. Barangay Hub teaser
5. Project transparency teaser
6. More community tools
7. Government services
8. Volunteer/contribute
9. Existing informational/footer content

### Tasks

- [x] Replace the LGU-service-led hero copy with the approved community-first headline and independent/community-built supporting copy.
- [x] Make “Explore Community Tools” the primary hero CTA and “Suggest an Idea” the secondary CTA; retain a clear Volunteer path.
- [x] Preserve search only if its scope remains clear. A service-only search must be labelled as such rather than implying it searches the new tools.
- [x] Add the four priority cards immediately after the hero, rendered from `community-tools.json`.
- [x] Add a prominent suggestion block that links to `/ideas` and explains what residents can submit.
- [x] Add the Barangay Hub teaser; it must not imply that per-barangay pages are already live.
- [x] Add the Project Tracker teaser using only sourced existing project data, or show it as a proposed roadmap item with no invented project cards.
- [x] Add a “More Community Tools” section for priorities 5–8, preserving roadmap order.
- [x] Move the current government-services grid below community-focused sections; retain its existing links and search/discovery paths.
- [x] Replace or adapt the existing volunteer prompt so its wording explains concrete contribution roles and has one reliable destination.
- [x] Update homepage title, meta description, Open Graph description, JSON-LD description, and visible footer tagline so they no longer call BetterMalolos an official LGU portal.
- [ ] Check that all in-page anchors, clean URLs, skip link, and mobile-menu focus behaviour still work after reordering. In-page anchors, the skip link, and existing clean URLs were verified; `/ideas` cannot resolve until Phase 3 creates the route.

### Exit criteria

- [x] The first viewport communicates community-built, independent, and practical local help without claiming LGU affiliation.
- [x] The first four community tools precede government services on desktop and mobile.
- [x] All existing service cards still work and are discoverable lower on the page.
- [x] No proposed tool is represented as operational.

## Phase 3 — `/ideas` page and submission flow

**Goal:** provide a privacy-aware, accessible community intake path.

### Page and form tasks

- [ ] Create `ideas/index.html` so the clean route `/ideas` resolves through the existing server/rewrite convention.
- [ ] Reuse the site header, hotline/info bar, footer, PWA assets, language controls, and base styles.
- [ ] Add the approved landing copy and make clear that BetterMalolos reviews submissions before public use.
- [ ] Implement required fields: submission type, title, description, category.
- [ ] Implement optional fields: barangay, general location, why it matters, suggested solution, source URL, name, email, volunteer interest, skills/expertise.
- [ ] Provide the five prescribed submission types and all prescribed categories, including Other.
- [ ] Include an explicit anonymous option. When selected, do not require, transmit, or display name/email fields.
- [ ] Add a concise privacy notice: submissions are reviewed; personal information is private by default; public summaries may be created; residents should not submit sensitive personal data or emergency reports.
- [ ] Add an emergency safety message with a link/number to existing emergency contacts; the ideas portal is not an emergency-reporting channel.
- [ ] Use native semantic labels, `fieldset`/`legend` for related controls, visible required indicators, `aria-describedby` for help/errors, and a keyboard-reachable submit action.
- [ ] Add client-side validation only for user experience; enforce validation again at the approved server/form-provider endpoint.
- [ ] Include a honeypot and rate limiting/anti-spam protection in the submission service. Do not expose service credentials in HTML or JavaScript.
- [ ] Display success only after the service confirms receipt. Provide a retry-safe error state and a `mailto:info@bettermalolos.org` fallback only if approved.
- [ ] Do not collect attachments in this release unless a storage, malware-scanning, retention, and moderation process has been approved.

### Submission payload contract

Use a versioned payload and send only fields actually completed by the resident:

```json
{
  "schemaVersion": 1,
  "submissionType": "idea",
  "title": "Example idea",
  "description": "What would help residents and why.",
  "category": "Flooding",
  "barangay": "",
  "location": "",
  "isAnonymous": true,
  "contact": null,
  "volunteerInterest": false,
  "sourceUrl": ""
}
```

The receiving service must validate allowed enum values, length limits, UTF-8 text, URL protocols, rate limits, and sanitize any future administrative display. Store no IP, analytics, or contact data beyond the documented service need and retention policy.

### Exit criteria

- [ ] `/ideas` works with JavaScript enabled and has a usable non-JavaScript fallback or an explicit alternative contact method.
- [ ] Valid, anonymous, invalid, network-error, and duplicate-submit paths have been manually tested.
- [ ] A submission cannot be reported as accepted unless it actually reached the approved receiver.
- [ ] The form does not make personally identifiable information public.

## Phase 4 — Community roadmap presentation

**Goal:** make the eight priorities visible, understandable, and non-competitive.

### Tasks

- [ ] Add a compact roadmap section to `/ideas` or a clearly linked section on the homepage, using `community-tools.json`.
- [ ] Show priority order, status, short benefit, and a context-appropriate CTA for each item.
- [ ] Explain that prioritisation considers impact, feasibility, urgency, evidence, and underserved communities—not only popularity.
- [ ] Do not add votes, supporter counts, comments, or public submissions without a moderation and abuse-prevention design.
- [ ] Add a “Share data or a source” CTA that uses `/ideas` with the relevant submission type preselected, if the form supports query parameters accessibly.
- [ ] Include a `last updated` field only when it can be maintained accurately.

### Exit criteria

- [ ] The roadmap preserves the product document’s exact priority order.
- [ ] Each card is understandable without institutional knowledge.
- [ ] The page makes no unsupported claim about community support or live data.

## Phase 5 — Navigation, SEO, PWA, and cross-page links

**Goal:** ensure residents can reach the new experience and crawlers/installations reflect it.

### Tasks

- [ ] Update the homepage header to use resident-focused navigation labels only where the destination exists.
- [ ] Use these top-level labels as the target architecture: Community Tools, Barangays, Projects & Budget, Services, City Information, Get Involved.
- [ ] For unavailable routes, use a roadmap/ideas destination with an explicit status instead of linking to a missing future route.
- [ ] Keep the logo linked to home and make Get Involved visually distinct without changing expected keyboard/dropdown interaction.
- [ ] Confirm mobile order: Community Tools, Barangays, Get Involved, Projects & Budget, Services, City Information.
- [ ] Decide whether to update shared navigation across the rest of the static site. If out of scope, ensure homepage links still lead to valid existing pages and document the intentional temporary difference.
- [ ] Add `/ideas` to `sitemap.xml`; verify canonical, title, description, robots handling, social metadata, and structured data as applicable.
- [ ] Add the ideas page and its required static assets to the service-worker cache strategy, then bump the cache version using the project convention.
- [ ] Check production `.htaccess`/clean-route behaviour with `npm run dev` and the production build output.

### Exit criteria

- [ ] Desktop and mobile navigation work with mouse, keyboard, touch, and screen-reader semantics.
- [ ] `/ideas`, all displayed existing destinations, 404 page, sitemap, and offline fallback behave correctly.
- [ ] A new PWA installation does not receive a stale homepage or omit the ideas page because of an old cache.

## Phase 6 — Automated tests and accessibility verification

**Goal:** protect the new release behaviour and prevent regressions in the existing header/modal experience.

### Add or extend Playwright tests

- [ ] Homepage smoke test: hero copy/CTAs, tool-section order, visible status labels, services below community sections, valid links.
- [ ] Ideas page test: required fields, anonymous toggle behaviour, client-side errors, success only with a mocked successful endpoint, and network-error state.
- [ ] Navigation test: desktop dropdowns and mobile menu order/focus trapping remain usable.
- [ ] Accessibility test: logical heading hierarchy, skip link, landmarks, focus order, labels, error announcement, contrast, and no keyboard trap.
- [ ] Responsive test at a narrow mobile viewport, tablet viewport, and desktop viewport; verify no horizontal overflow.
- [ ] Test with JavaScript disabled where practical, especially `/ideas` fallback behaviour.

### Manual verification checklist

- [ ] Chrome, Firefox, Safari, and Edge (or the supported project matrix).
- [ ] Keyboard-only navigation of the header, homepage CTAs, tool cards, form, form errors, and footer.
- [ ] Screen-reader spot check for page title, form legend/labels, required fields, and submission result.
- [ ] English and Filipino language switch after every new section/page is present.
- [ ] 320px-wide mobile layout and reduced-motion preference.
- [ ] No console errors, failed local JSON requests, or mixed-content warnings.

### Exit criteria

- [ ] New tests pass locally and existing tests have not regressed.
- [ ] Known pre-existing failures are recorded separately rather than attributed to this release.

## Phase 7 — Build, review, and release handoff

**Goal:** produce a reviewable, deployable release without accidental version or data changes.

### Tasks

- [ ] Run `npm run format:check` and address formatting only in files touched by the feature.
- [ ] Run `npm test` (or document the focused suite if the full suite cannot run) and record results.
- [ ] Run `npm run build -- --no-bump` for a release-candidate build; inspect the generated `/ideas` page, homepage, JSON files, sitemap, and service worker in `dist/`.
- [ ] Verify clean URLs with the local server and confirm `/ideas` does not need `.html`.
- [ ] Review the diff for accidental `dist/`, dependency-lock, version, or unrelated security-document changes.
- [ ] Confirm all public statements distinguish BetterMalolos from the LGU and identify sources where factual data is presented.
- [ ] Capture before/after desktop and mobile screenshots for reviewers.
- [ ] Write release notes describing the community-first homepage, ideas intake, roadmap statuses, and intentionally deferred live civic tools.
- [ ] Bump the release version only through the project’s established version/build workflow after approval.

### Final acceptance checklist

- [ ] Homepage communicates the six success statements in section 21 of the product document within the first screenful/scroll.
- [ ] Community tool status is accurate everywhere it appears.
- [ ] Government services remain functional and visibly available.
- [ ] `/ideas` has a real, tested submission route or is deliberately not exposed as a live submission form.
- [ ] Privacy, moderation, anti-spam, and emergency disclaimers are present and correct.
- [ ] Accessibility, responsive behaviour, tests, build, PWA cache, SEO, and clean URLs have been verified.

## Explicitly deferred after v1.0.3

- Live flood, roadwork, water, transport, and opportunity data integrations.
- Citizen reports, map layers, photos, and location-based verification.
- Individual barangay pages and a complete Barangay Hub.
- Public project-detail records beyond source-verified data already published by the site.
- Public ideas, upvotes, supporters, comments, and volunteer matching.
- File uploads/attachments.
- A universal “Saan Ako Lalapit?” responsibility-routing engine.

Each deferred feature needs its own data-source inventory, owner, update cadence, source attribution, moderation/privacy assessment, and launch acceptance criteria before it can move to `Beta` or `Live`.

## Agent handoff template

Use this at the end of each phase so the next agent can safely continue:

```text
Phase completed:
Scope delivered:
Files changed:
Routes affected:
Data/schema changes:
Submission transport status:
Tests run and results:
Manual checks completed:
Known issues / pre-existing failures:
Decisions needed before next phase:
Suggested next phase:
```

## Recommended commit boundaries

1. `Docs: define v1.0.3 implementation contract`
2. `Add: community tools data and status components`
3. `Update: reorganize homepage around community tools`
4. `Add: community ideas portal`
5. `Update: community roadmap and navigation`
6. `Test: cover v1.0.3 homepage and ideas flow`

Keep each commit independently reviewable and do not mix generated production output, unrelated maintenance, or unverified civic content into feature commits.
